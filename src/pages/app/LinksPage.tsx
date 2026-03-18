import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Link2, ArrowUpDown, Check, Phone, Calculator, Trash2, Edit2, Upload, Mail, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableLinkCard } from '@/components/links/SortableLinkCard';
import { cn } from '@/lib/utils';
import RookieCalculator from '@/components/RookieCalculator';
import VetCalculator from '@/components/VetCalculator';



interface ManagedLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  target_role: string;
  display_order: number;
  is_active: boolean;
}

interface PhoneEntry {
  id: string;
  name: string;
  phone: string;
  label: string;
  display_order: number;
}

interface EmailEntry {
  id: string;
  name: string;
  email: string;
  label: string;
  display_order: number;
}

type PageTab = 'links' | 'phone-numbers' | 'emails' | 'calculators' | 'pay-scales';

/** Normalize a US phone number to (XXX) XXX-XXXX format */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return raw;
}

/** Check if raw phone input has at least 10 digits (US) */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return d.length === 10;
}

/** Phone number regex: matches patterns like +1 (801) 458-4775, 801-555-1234, 8015551234 */
const PHONE_REGEX = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/;

/** Extract phone number and name from a free-form line */
function extractPhoneFromLine(line: string): { name: string; phone: string } | null {
  const match = line.match(PHONE_REGEX);
  if (!match) return null;
  const rawPhone = match[0];
  if (!isValidPhone(rawPhone)) return null;
  const phone = normalizePhone(rawPhone);
  // Everything that's not the phone number is the name
  const name = line.replace(rawPhone, '').replace(/[,\t|→\->]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { name: name || 'Unknown', phone };
}

export default function LinksPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'owner' || role === 'manager';

  const [links, setLinks] = useState<ManagedLink[]>([]);
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [phonesLoading, setPhonesLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLink, setEditingLink] = useState<ManagedLink | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>('links');
  const [calcTab, setCalcTab] = useState<'rookie' | 'veteran'>('rookie');

  // Link form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [targetRole, setTargetRole] = useState<string>('all');
  const [icon, setIcon] = useState('link');

  // Phone form state
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [editingPhone, setEditingPhone] = useState<PhoneEntry | null>(null);
  const [phoneName, setPhoneName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneLabel, setPhoneLabel] = useState('General');

  // Email state
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [editingEmail, setEditingEmail] = useState<EmailEntry | null>(null);
  const [emailName, setEmailName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailLabel, setEmailLabel] = useState('General');

  // Mass upload state
  const [showMassUpload, setShowMassUpload] = useState(false);
  const [massUploadText, setMassUploadText] = useState('');
  const [massUploadType, setMassUploadType] = useState<'phones' | 'links'>('phones');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchLinks = async () => {
    const { data } = await supabase
      .from('managed_links')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setLinks((data as ManagedLink[]) || []);
    setLoading(false);
  };

  const fetchPhones = async () => {
    const { data } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setPhones((data as PhoneEntry[]) || []);
    setPhonesLoading(false);
  };

  const fetchEmails = async () => {
    const { data } = await (supabase as any)
      .from('managed_emails')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setEmails((data as EmailEntry[]) || []);
    setEmailsLoading(false);
  };

  useEffect(() => { fetchLinks(); fetchPhones(); fetchEmails(); }, []);

  const filteredLinks = links;

  // ── Link CRUD ──
  const resetForm = () => {
    setTitle(''); setUrl(''); setDescription(''); setTargetRole('all'); setIcon('link');
    setEditingLink(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) { toast.error('Title and URL are required'); return; }
    if (editingLink) {
      const { error } = await supabase
        .from('managed_links')
        .update({ title, url, description: description || null, target_role: targetRole, icon })
        .eq('id', editingLink.id);
      if (error) { toast.error('Failed to update link'); return; }
      toast.success('Link updated');
    } else {
      const { error } = await supabase
        .from('managed_links')
        .insert({ title, url, description: description || null, target_role: targetRole, icon, display_order: links.length });
      if (error) { toast.error('Failed to add link'); return; }
      toast.success('Link added');
    }
    resetForm();
    setShowAdd(false);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('managed_links').update({ is_active: false }).eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Link removed');
    fetchLinks();
  };

  const openEdit = (link: ManagedLink) => {
    setEditingLink(link);
    setTitle(link.title);
    setUrl(link.url);
    setDescription(link.description || '');
    setTargetRole(link.target_role);
    setIcon(link.icon || 'link');
    setShowAdd(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredLinks.findIndex(l => l.id === active.id);
    const newIndex = filteredLinks.findIndex(l => l.id === over.id);
    const reordered = arrayMove(filteredLinks, oldIndex, newIndex);
    const updatedLinks = links.map(l => {
      const newPos = reordered.findIndex(r => r.id === l.id);
      return newPos >= 0 ? { ...l, display_order: newPos } : l;
    });
    setLinks(updatedLinks.sort((a, b) => a.display_order - b.display_order));
    const updates = reordered.map((link, idx) =>
      supabase.from('managed_links').update({ display_order: idx }).eq('id', link.id)
    );
    const results = await Promise.all(updates);
    if (results.some(r => r.error)) { toast.error('Failed to save order'); fetchLinks(); }
  };

  // ── Phone CRUD ──
  const resetPhoneForm = () => {
    setPhoneName(''); setPhoneNumber(''); setPhoneLabel('General'); setEditingPhone(null);
  };

  const handleSavePhone = async () => {
    if (!phoneName.trim() || !phoneNumber.trim()) { toast.error('Name and number are required'); return; }
    if (!isValidPhone(phoneNumber)) { toast.error('Please enter a valid phone number'); return; }
    const normalized = normalizePhone(phoneNumber);
    if (editingPhone) {
      const { error } = await supabase
        .from('phone_numbers')
        .update({ name: phoneName, phone: normalized, label: phoneLabel })
        .eq('id', editingPhone.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Phone updated');
    } else {
      const { error } = await supabase
        .from('phone_numbers')
        .insert({ name: phoneName, phone: normalized, label: phoneLabel, display_order: phones.length });
      if (error) { toast.error('Failed to add'); return; }
      toast.success('Phone added');
    }
    resetPhoneForm();
    setShowAddPhone(false);
    fetchPhones();
  };

  const handleDeletePhone = async (id: string) => {
    const { error } = await supabase.from('phone_numbers').update({ is_active: false }).eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Phone removed');
    fetchPhones();
  };

  // ── Mass Upload ──
  const handleMassUpload = async () => {
    const lines = massUploadText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error('No data to import'); return; }

    if (massUploadType === 'phones') {
      const entries: { name: string; phone: string; label: string; display_order: number }[] = [];
      const skipped: string[] = [];
      const existingNormalized = new Set(phones.map(p => normalizePhone(p.phone)));

      for (let i = 0; i < lines.length; i++) {
        const result = extractPhoneFromLine(lines[i]);
        if (!result) {
          skipped.push(lines[i]);
          continue;
        }
        // Duplicate detection
        if (existingNormalized.has(result.phone)) {
          // Update name for existing entry instead of creating duplicate
          const existing = phones.find(p => normalizePhone(p.phone) === result.phone);
          if (existing && result.name && result.name !== 'Unknown') {
            await supabase.from('phone_numbers').update({ name: result.name }).eq('id', existing.id);
          }
          continue;
        }
        existingNormalized.add(result.phone);
        entries.push({ name: result.name, phone: result.phone, label: 'General', display_order: phones.length + i });
      }

      if (entries.length === 0 && skipped.length === 0) {
        toast.info('All numbers already exist');
      } else if (entries.length === 0) {
        toast.error(`No valid phone numbers found. ${skipped.length} line(s) skipped.`);
      } else {
        const { error } = await supabase.from('phone_numbers').insert(entries);
        if (error) { toast.error('Upload failed'); return; }
        const msg = skipped.length > 0
          ? `${entries.length} added, ${skipped.length} invalid skipped`
          : `${entries.length} phone numbers added`;
        toast.success(msg);
      }
      fetchPhones();
    } else {
      const entries: { title: string; url: string; description: string | null; display_order: number }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        const title = parts[0]?.trim();
        const url = parts[1]?.trim();
        const description = parts[2]?.trim() || null;
        if (title && url && (url.startsWith('http') || url.startsWith('www'))) {
          entries.push({ title, url: url.startsWith('www') ? `https://${url}` : url, description, display_order: links.length + i });
        }
      }
      if (entries.length === 0) { toast.error('No valid entries found. Use format: Title, URL'); return; }
      const { error } = await supabase.from('managed_links').insert(entries);
      if (error) { toast.error('Upload failed'); return; }
      toast.success(`${entries.length} links added`);
      fetchLinks();
    }
    setMassUploadText('');
    setShowMassUpload(false);
  };

  // ── Email CRUD ──
  const resetEmailForm = () => {
    setEmailName(''); setEmailAddress(''); setEmailLabel('General'); setEditingEmail(null);
  };

  const handleSaveEmail = async () => {
    if (!emailName.trim() || !emailAddress.trim()) { toast.error('Name and email are required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())) { toast.error('Please enter a valid email address'); return; }
    if (editingEmail) {
      const { error } = await (supabase as any)
        .from('managed_emails')
        .update({ name: emailName.trim(), email: emailAddress.trim(), label: emailLabel })
        .eq('id', editingEmail.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Email updated');
    } else {
      const { error } = await (supabase as any)
        .from('managed_emails')
        .insert({ name: emailName.trim(), email: emailAddress.trim(), label: emailLabel, display_order: emails.length });
      if (error) { toast.error('Failed to add'); return; }
      toast.success('Email added');
    }
    resetEmailForm();
    setShowAddEmail(false);
    fetchEmails();
  };

  const handleDeleteEmail = async (id: string) => {
    const { error } = await (supabase as any).from('managed_emails').update({ is_active: false }).eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Email removed');
    fetchEmails();
  };

  const TABS: { id: PageTab; label: string; icon: typeof Link2 }[] = [
    { id: 'links', label: 'Links', icon: Link2 },
    { id: 'phone-numbers', label: 'Phone Numbers', icon: Phone },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'calculators', label: 'Calculators', icon: Calculator },
    { id: 'pay-scales', label: 'Pay Scales', icon: DollarSign },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Resources</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Links, tools & references</p>
          </div>
          {isAdmin && (activeTab === 'links' || activeTab === 'phone-numbers') && (
            <div className="flex gap-2">
              {/* Mass Upload */}
              <Dialog open={showMassUpload} onOpenChange={setShowMassUpload}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Upload className="w-3.5 h-3.5" /> Mass Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Mass Upload</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={massUploadType === 'phones' ? 'default' : 'outline'}
                        onClick={() => setMassUploadType('phones')}
                        className="text-xs"
                      >
                        <Phone className="w-3.5 h-3.5 mr-1" /> Phone Numbers
                      </Button>
                      <Button
                        size="sm"
                        variant={massUploadType === 'links' ? 'default' : 'outline'}
                        onClick={() => setMassUploadType('links')}
                        className="text-xs"
                      >
                        <Link2 className="w-3.5 h-3.5 mr-1" /> Links
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {massUploadType === 'phones'
                        ? 'Paste one per line — phone numbers are auto-detected. Any format works: Name +1 (801) 555-1234, 801-555-1234 Name, etc.'
                        : 'Paste one per line: Title, URL  or  Title ⇥ URL ⇥ Description'}
                    </p>
                    <Textarea
                      placeholder={massUploadType === 'phones'
                        ? "Kirsten Hawx Assistant +1 (801) 458-4775\nJohn Smith 801-555-3322\n8015554455"
                        : "Google Drive, https://drive.google.com\nSlack, https://slack.com, Team Chat"}
                      value={massUploadText}
                      onChange={e => setMassUploadText(e.target.value)}
                      rows={8}
                      className="font-mono text-xs"
                    />
                    <Button onClick={handleMassUpload} className="w-full">
                      Import {massUploadType === 'phones' ? 'Phone Numbers' : 'Links'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Add single item */}
              {activeTab === 'links' && (
                <>
                  {filteredLinks.length > 1 && (
                    <Button
                      size="sm"
                      variant={isReordering ? 'default' : 'outline'}
                      className="gap-1.5 text-xs"
                      onClick={isReordering ? () => { setIsReordering(false); toast.success('Order saved'); } : () => setIsReordering(true)}
                    >
                      {isReordering ? <Check className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
                      {isReordering ? 'Done' : 'Reorder'}
                    </Button>
                  )}
                  <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1.5 text-xs">
                        <Plus className="w-3.5 h-3.5" /> Add Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingLink ? 'Edit Link' : 'Add New Link'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 pt-2">
                        <Input placeholder="Link title" value={title} onChange={e => setTitle(e.target.value)} />
                        <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
                        <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={targetRole} onValueChange={setTargetRole}>
                            <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Everyone</SelectItem>
                              <SelectItem value="rookie">Rookies Only</SelectItem>
                              <SelectItem value="manager">Managers Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={icon} onValueChange={setIcon}>
                            <SelectTrigger><SelectValue placeholder="Icon" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="link">Link</SelectItem>
                              <SelectItem value="book">Book</SelectItem>
                              <SelectItem value="users">Users</SelectItem>
                              <SelectItem value="globe">Globe</SelectItem>
                              <SelectItem value="external">External</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleSave} className="w-full">{editingLink ? 'Update' : 'Add Link'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {activeTab === 'phone-numbers' && (
                <Dialog open={showAddPhone} onOpenChange={(o) => { setShowAddPhone(o); if (!o) resetPhoneForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 text-xs">
                      <Plus className="w-3.5 h-3.5" /> Add Phone
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingPhone ? 'Edit Phone' : 'Add Phone Number'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <Input placeholder="Name" value={phoneName} onChange={e => setPhoneName(e.target.value)} />
                      <div>
                        <Input placeholder="Phone number (e.g. 801-555-1234)" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                        <p className="text-[10px] text-muted-foreground mt-1">Accepts: 8015551234, (801) 555-1234, 801-555-1234, +1 801 555 1234</p>
                      </div>
                      <Input placeholder="Label (e.g. Manager, Office)" value={phoneLabel} onChange={e => setPhoneLabel(e.target.value)} />
                      <Button onClick={handleSavePhone} className="w-full">{editingPhone ? 'Update' : 'Add Phone'}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>

        {/* Tab toggle */}
        <div className="p-1 bg-muted/50 rounded-xl mb-5 border border-border/30">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsReordering(false); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-md border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", activeTab === tab.id && "text-primary")} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Links Tab */}
        {activeTab === 'links' && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-28 rounded-xl bg-muted/20 animate-pulse" />
                ))}
              </div>
            ) : filteredLinks.length === 0 ? (
              <Card className="p-8 text-center">
                <Link2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No links added yet</p>
                {isAdmin && <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Link" to get started</p>}
              </Card>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredLinks.map(l => l.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredLinks.map(link => (
                      <SortableLinkCard
                        key={link.id}
                        link={link}
                        isAdmin={isAdmin}
                        isReordering={isReordering}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}

        {/* Phone Numbers Tab */}
        {activeTab === 'phone-numbers' && (
          <>
            {phonesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />)}
              </div>
            ) : phones.length === 0 ? (
              <Card className="p-8 text-center">
                <Phone className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No phone numbers added yet</p>
                {isAdmin && <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Phone" or "Mass Upload" to get started</p>}
              </Card>
            ) : (
              <div className="space-y-2">
                {phones.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border/50 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2">
                          <a href={`tel:${p.phone}`} className="text-xs text-primary hover:underline">{p.phone}</a>
                          {p.label !== 'General' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{p.label}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingPhone(p);
                            setPhoneName(p.name);
                            setPhoneNumber(p.phone);
                            setPhoneLabel(p.label);
                            setShowAddPhone(true);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeletePhone(p.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Notepad Tab */}
        {activeTab === 'notepad' && (
          <Suspense fallback={<div className="animate-pulse text-muted-foreground text-center py-12">Loading notepad...</div>}>
            <NotepadEmbedded />
          </Suspense>
        )}

        {/* Calculators Tab */}
        {activeTab === 'calculators' && (
          <div>
            {/* Rookie / Veteran Toggle */}
            <div className="flex justify-center mb-6">
              <div className="relative flex w-full max-w-xs h-12 rounded-xl overflow-hidden border-2 border-border/50 bg-muted/30">
                <button
                  onClick={() => setCalcTab('rookie')}
                  className={cn(
                    "flex-1 flex items-center justify-center text-sm font-bold uppercase tracking-wide transition-all duration-300 relative z-10",
                    calcTab === 'rookie'
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {calcTab === 'rookie' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 -z-10" />
                  )}
                  Rookie
                </button>
                <div className="w-px bg-border/50" />
                <button
                  onClick={() => setCalcTab('veteran')}
                  className={cn(
                    "flex-1 flex items-center justify-center text-sm font-bold uppercase tracking-wide transition-all duration-300 relative z-10",
                    calcTab === 'veteran'
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {calcTab === 'veteran' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 -z-10" />
                  )}
                  Veteran
                </button>
              </div>
            </div>
            {calcTab === 'rookie' ? <RookieCalculator /> : <VetCalculator />}
          </div>
        )}

        {/* Pay Scales Tab */}
        {activeTab === 'pay-scales' && (
          <div className="text-center py-16">
            <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-1">Pay Scales</p>
            <p className="text-sm text-muted-foreground">Coming soon — pay scale information will be added here.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/** Embedded notepad — renders the notepad content without AppLayout wrapper */
function NotepadEmbedded() {
  // We lazy-load the full NotepadPage but render its content inline
  // For now, redirect approach — use the same notepad logic inline
  const { user } = useAuth();
  const [allNotes, setAllNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('video_notes')
        .select('id, notes, updated_at, video_id, training_videos (id, title, category)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      setAllNotes(data || []);
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  if (isLoading) return <div className="animate-pulse text-muted-foreground text-center py-12">Loading notes...</div>;

  if (allNotes.length === 0) {
    return (
      <div className="text-center py-16">
        <StickyNote className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-lg font-semibold text-foreground mb-1">No notes yet</p>
        <p className="text-sm text-muted-foreground">Start taking notes while watching training videos!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{allNotes.length} notes from training videos</p>
      {allNotes.map((note: any) => (
        <div key={note.id} className="p-4 bg-card border border-border/50 rounded-lg">
          <p className="text-sm font-medium text-foreground">{note.training_videos?.title || 'Untitled'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{note.training_videos?.category}</p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/80 mt-2 max-h-32 overflow-y-auto">
            {note.notes || 'No content'}
          </pre>
        </div>
      ))}
    </div>
  );
}
