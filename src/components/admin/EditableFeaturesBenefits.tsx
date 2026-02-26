import { useState, useEffect } from 'react';
import { Pencil, Save, X, Loader2, Plus, Trash2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FeatureBenefit {
  id: string;
  feature: string;
  benefit: string;
}

interface EditableFeaturesBenefitsProps {
  contentKey: string;
  initialItems: FeatureBenefit[];
  onUpdate?: (items: FeatureBenefit[]) => void;
  className?: string;
}

export function EditableFeaturesBenefits({
  contentKey,
  initialItems,
  onUpdate,
  className = ''
}: EditableFeaturesBenefitsProps) {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'owner';
  
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState<FeatureBenefit[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  if (!isAdmin) {
    return null;
  }

  const handleAddItem = () => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      feature: '',
      benefit: ''
    }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: 'feature' | 'benefit', value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { data: existingContent } = await supabase
        .from('training_content')
        .select('id, version')
        .eq('content_key', contentKey)
        .single();

      const featuresData = items
        .filter(i => i.feature.trim() || i.benefit.trim())
        .map(i => ({ id: i.id, feature: i.feature, benefit: i.benefit }));

      if (existingContent) {
        const { error } = await supabase
          .from('training_content')
          .update({
            features_benefits: featuresData as any,
            last_edited_by: user.id,
            last_edited_at: new Date().toISOString(),
            version: existingContent.version + 1,
          })
          .eq('id', existingContent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('training_content')
          .insert([{
            content_key: contentKey,
            section_type: 'feature_benefit',
            features_benefits: featuresData as any,
            last_edited_by: user.id,
          }]);

        if (error) throw error;
      }

      toast.success('Features & Benefits saved!');
      setIsEditing(false);
      onUpdate?.(featuresData);
    } catch (err) {
      console.error('Error saving features/benefits:', err);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("admin-features-benefits", className)}>
      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 text-xs text-primary hover:underline mb-2"
        >
          <List className="w-3.5 h-3.5" />
          <span>Edit Features & Benefits</span>
          <Pencil className="w-3 h-3" />
        </button>
      ) : (
        <div className="border-2 border-primary rounded-lg p-4 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <List className="w-4 h-4" />
              Edit Features & Benefits
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddItem}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {items.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                <span className="text-xs font-bold text-muted-foreground mt-2">
                  {index + 1}.
                </span>
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.feature}
                    onChange={(e) => handleUpdateItem(item.id, 'feature', e.target.value)}
                    placeholder="Feature name..."
                    className="text-sm"
                  />
                  <Textarea
                    value={item.benefit}
                    onChange={(e) => handleUpdateItem(item.id, 'benefit', e.target.value)}
                    placeholder="Benefit description..."
                    className="text-sm min-h-[60px]"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setItems(initialItems);
                setIsEditing(false);
              }}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
