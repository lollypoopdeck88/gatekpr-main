import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Plus, X, BarChart3 } from 'lucide-react';

interface PollData {
  question: string;
  options: string[];
  allowMultiple: boolean;
  endsAt: string;
}

interface PollCreatorProps {
  value: PollData | null;
  onChange: (poll: PollData | null) => void;
}

export function PollCreator({ value, onChange }: PollCreatorProps) {
  const [isEnabled, setIsEnabled] = useState(!!value);

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    if (checked) {
      onChange({
        question: '',
        options: ['', ''],
        allowMultiple: false,
        endsAt: '',
      });
    } else {
      onChange(null);
    }
  };

  const updatePoll = (updates: Partial<PollData>) => {
    if (!value) return;
    onChange({ ...value, ...updates });
  };

  const addOption = () => {
    if (!value || value.options.length >= 6) return;
    updatePoll({ options: [...value.options, ''] });
  };

  const removeOption = (index: number) => {
    if (!value || value.options.length <= 2) return;
    updatePoll({ options: value.options.filter((_, i) => i !== index) });
  };

  const updateOption = (index: number, text: string) => {
    if (!value) return;
    const newOptions = [...value.options];
    newOptions[index] = text;
    updatePoll({ options: newOptions });
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <Label htmlFor="enable-poll" className="font-medium cursor-pointer">
            Include a Poll
          </Label>
        </div>
        <Switch
          id="enable-poll"
          checked={isEnabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {isEnabled && value && (
        <div className="space-y-4 pl-6 border-l-2 border-primary/20">
          <div className="space-y-2">
            <Label htmlFor="poll-question">Poll Question</Label>
            <Input
              id="poll-question"
              value={value.question}
              onChange={(e) => updatePoll({ question: e.target.value })}
              placeholder="What do you think about...?"
            />
          </div>

          <div className="space-y-2">
            <Label>Options (2-6)</Label>
            {value.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
                {value.options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {value.options.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allow-multiple"
              checked={value.allowMultiple}
              onCheckedChange={(checked) => updatePoll({ allowMultiple: checked === true })}
            />
            <Label htmlFor="allow-multiple" className="text-sm cursor-pointer">
              Allow multiple selections
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-ends">Poll End Date (optional)</Label>
            <Input
              id="poll-ends"
              type="datetime-local"
              value={value.endsAt}
              onChange={(e) => updatePoll({ endsAt: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}