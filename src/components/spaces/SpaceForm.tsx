import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export interface SpaceFormData {
  name: string;
  description: string;
  location_notes: string;
  capacity: string;
  pricing_info: string;
  is_active: boolean;
}

interface SpaceFormProps {
  formData: SpaceFormData;
  setFormData: React.Dispatch<React.SetStateAction<SpaceFormData>>;
}

export const SpaceForm: React.FC<SpaceFormProps> = ({
  formData,
  setFormData,
}) => (
  <div className='space-y-4'>
    <div>
      <Label htmlFor='name'>Space Name *</Label>
      <Input
        id='name'
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder='e.g., Clubhouse, Pool Pavilion'
      />
    </div>
    <div>
      <Label htmlFor='description'>Description</Label>
      <Textarea
        id='description'
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder='Describe the space and its amenities...'
      />
    </div>
    <div>
      <Label htmlFor='location'>Location Notes</Label>
      <Input
        id='location'
        value={formData.location_notes}
        onChange={(e) =>
          setFormData({ ...formData, location_notes: e.target.value })
        }
        placeholder='e.g., Near the main entrance'
      />
    </div>
    <div className='grid grid-cols-2 gap-4'>
      <div>
        <Label htmlFor='capacity'>Capacity</Label>
        <Input
          id='capacity'
          type='number'
          value={formData.capacity}
          onChange={(e) =>
            setFormData({ ...formData, capacity: e.target.value })
          }
          placeholder='Max people'
        />
      </div>
      <div className='flex items-center gap-2 pt-6'>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, is_active: checked })
          }
        />
        <Label>Active</Label>
      </div>
    </div>
    <div>
      <Label htmlFor='pricing'>Pricing Info</Label>
      <Textarea
        id='pricing'
        value={formData.pricing_info}
        onChange={(e) =>
          setFormData({ ...formData, pricing_info: e.target.value })
        }
        placeholder='e.g., $50 for residents, $100 deposit required'
      />
    </div>
  </div>
);
