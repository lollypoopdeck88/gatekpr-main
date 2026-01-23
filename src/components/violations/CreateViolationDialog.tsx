import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Upload, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { ViolationCategory } from '@/lib/violationTypes';

interface CreateViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ViolationCategory[];
  hoaId: string;
}

export function CreateViolationDialog({ open, onOpenChange, categories, hoaId }: CreateViolationDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'details' | 'generate' | 'review'>('details');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    residentId: '',
    categoryId: '',
    title: '',
    description: '',
    location: '',
    observedAt: new Date().toISOString().slice(0, 16),
    fineAmount: 0,
    fineDueDate: '',
  });
  const [generatedContent, setGeneratedContent] = useState('');
  const [evidence, setEvidence] = useState<File[]>([]);

  // Fetch residents for selection - exclude super_admins
  const { data: residents } = useQuery({
    queryKey: ['residents-for-violation', hoaId],
    queryFn: async () => {
      // First get all active residents in this HOA
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, user_id')
        .eq('hoa_id', hoaId)
        .eq('status', 'active')
        .order('name');
      
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Get user roles to filter out super_admins
      const userIds = profiles.map(p => p.user_id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      if (rolesError) throw rolesError;
      
      // Create a set of super_admin user IDs
      const superAdminIds = new Set(
        (roles || [])
          .filter(r => r.role === 'super_admin')
          .map(r => r.user_id)
      );
      
      // Filter out super_admins
      return profiles.filter(p => !superAdminIds.has(p.user_id));
    },
    enabled: !!hoaId,
  });

  // Fetch HOA documents for context
  const { data: hoaDocs } = useQuery({
    queryKey: ['hoa-docs-for-ai', hoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('name, category, description')
        .eq('hoa_id', hoaId)
        .in('category', ['Bylaws', 'Rules']);
      if (error) throw error;
      return data;
    },
    enabled: !!hoaId,
  });

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setFormData({
      ...formData,
      categoryId,
      title: category ? `${category.name} Violation` : formData.title,
      fineAmount: category?.default_fine_amount || 0,
    });
  };

  const generateWithAI = async () => {
    if (!formData.residentId || !formData.description) {
      toast.error('Please fill in resident and description first');
      return;
    }

    setIsGenerating(true);
    try {
      const resident = residents?.find(r => r.id === formData.residentId);
      const category = categories.find(c => c.id === formData.categoryId);
      
      const bylawsContext = hoaDocs?.map(d => `${d.name}: ${d.description || d.category}`).join('\n');

      const response = await supabase.functions.invoke('ai-document-generator', {
        body: {
          type: 'violation_notice',
          violationType: category?.name || 'Violation',
          location: formData.location,
          observedAt: formData.observedAt,
          description: formData.description,
          residentName: resident?.name || 'Resident',
          bylawsContext,
        },
      });

      if (response.error) throw response.error;
      
      setGeneratedContent(response.data.content);
      setStep('review');
      toast.success('Notice generated! Please review before sending.');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate notice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const createViolation = useMutation({
    mutationFn: async (asDraft: boolean) => {
      // Upload evidence files first
      const evidenceUrls: { url: string; type: string; size: number }[] = [];
      
      for (const file of evidence) {
        const filePath = `${hoaId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('violation-evidence')
          .upload(filePath, file);
        
        if (!uploadError) {
          evidenceUrls.push({
            url: filePath,
            type: file.type,
            size: file.size,
          });
        }
      }

      // Create violation record
      const { data: violation, error } = await supabase
        .from('violations')
        .insert({
          hoa_id: hoaId,
          resident_id: formData.residentId,
          category_id: formData.categoryId || null,
          title: formData.title,
          description: formData.description,
          location: formData.location || null,
          observed_at: formData.observedAt,
          notice_content: generatedContent || null,
          ai_generated: !!generatedContent,
          ai_disclaimer_shown: !!generatedContent,
          fine_amount: formData.fineAmount,
          fine_due_date: formData.fineDueDate || null,
          status: asDraft ? 'draft' : 'sent',
          created_by: user!.id,
          sent_at: asDraft ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Create evidence records
      if (evidenceUrls.length > 0) {
        await supabase.from('violation_evidence').insert(
          evidenceUrls.map(ev => ({
            violation_id: violation.id,
            file_url: ev.url,
            file_type: ev.type,
            file_size: ev.size,
            uploaded_by: user!.id,
          }))
        );
      }

      // If sending, notify resident
      if (!asDraft) {
        const resident = residents?.find(r => r.id === formData.residentId);
        if (resident?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: resident.email,
              type: 'violation_notice',
              data: {
                residentName: resident.name,
                violationTitle: formData.title,
                violationDescription: formData.description,
                noticeContent: generatedContent,
              },
            },
          });
        }
      }

      return violation;
    },
    onSuccess: (_, asDraft) => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      toast.success(asDraft ? 'Violation saved as draft' : 'Violation notice sent!');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Create violation error:', error);
      toast.error('Failed to create violation');
    },
  });

  const resetForm = () => {
    setStep('details');
    setFormData({
      residentId: '',
      categoryId: '',
      title: '',
      description: '',
      location: '',
      observedAt: new Date().toISOString().slice(0, 16),
      fineAmount: 0,
      fineDueDate: '',
    });
    setGeneratedContent('');
    setEvidence([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Violation Notice</DialogTitle>
          <DialogDescription>
            Document a violation and optionally use AI to generate a professional notice
          </DialogDescription>
        </DialogHeader>

        <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">1. Details</TabsTrigger>
            <TabsTrigger value="generate" disabled={!formData.residentId}>2. Generate</TabsTrigger>
            <TabsTrigger value="review" disabled={!generatedContent && step !== 'review'}>3. Review</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resident *</Label>
                <Select value={formData.residentId} onValueChange={(v) => setFormData({ ...formData, residentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resident" />
                  </SelectTrigger>
                  <SelectContent>
                    {residents?.map((resident) => (
                      <SelectItem key={resident.id} value={resident.id}>
                        {resident.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief violation title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the violation in detail..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Where was it observed?"
                />
              </div>

              <div className="space-y-2">
                <Label>Date/Time Observed *</Label>
                <Input
                  type="datetime-local"
                  value={formData.observedAt}
                  onChange={(e) => setFormData({ ...formData, observedAt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fine Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(formData.fineAmount / 100).toFixed(2)}
                    onChange={(e) => setFormData({ ...formData, fineAmount: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fine Due Date</Label>
                <Input
                  type="date"
                  value={formData.fineDueDate}
                  onChange={(e) => setFormData({ ...formData, fineDueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Evidence (Photos/Documents)</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setEvidence([...evidence, ...Array.from(e.target.files)]);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {evidence.length > 0 ? `${evidence.length} file(s) selected` : 'Upload evidence'}
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button 
                onClick={() => setStep('generate')}
                disabled={!formData.residentId || !formData.title || !formData.description}
              >
                Next: Generate Notice
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="space-y-4 mt-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                AI will generate a professional violation notice using your HOA's bylaws and rules as context.
                You can review and edit before sending.
              </AlertDescription>
            </Alert>

            <div className="text-center py-8 space-y-4">
              <Sparkles className="h-12 w-12 mx-auto text-purple-500" />
              <h3 className="text-lg font-semibold">Generate AI Notice</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Click below to generate a professional violation notice. The AI will reference your HOA documents
                to ensure compliance with your community's rules.
              </p>
              <Button onClick={generateWithAI} disabled={isGenerating} size="lg">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Notice
                  </>
                )}
              </Button>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
              <Button variant="ghost" onClick={() => setStep('review')}>
                Skip AI & Write Manually
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4 mt-4">
            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Disclaimer:</strong> This content was generated with AI assistance. 
                Please review carefully and make any necessary edits before sending. 
                This is not legal advice.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Notice Content</Label>
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                placeholder="Enter or edit the violation notice content..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('generate')}>Back</Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => createViolation.mutate(true)}
                  disabled={createViolation.isPending}
                >
                  {createViolation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Save as Draft
                </Button>
                <Button 
                  onClick={() => createViolation.mutate(false)}
                  disabled={createViolation.isPending}
                >
                  {createViolation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send to Resident
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
