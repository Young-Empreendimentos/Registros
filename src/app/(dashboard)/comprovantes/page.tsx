'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentPreview } from '@/components/document-preview';
import { FileCheck, Plus, ExternalLink, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ComprovanteRow {
  id: string;
  url: string;
  descricao: string | null;
  created_at: string;
  lote_id: string;
  registro_id: string;
  uploaded_by: string;
  lote_numero?: string;
  empreendimento_nome?: string;
}

interface LoteOption {
  id: string;
  numero: string;
  empreendimento: string;
  registro_id: string;
}

export default function ComprovantesPage() {
  const [comprovantes, setComprovantes] = useState<ComprovanteRow[]>([]);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<string>('');
  const [url, setUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const supabase = createClient();
  const { profile } = useProfile();
  const canEdit = profile?.role !== 'leitura';

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: compData }, { data: lotesData }, { data: empsData }, { data: regsData }] = await Promise.all([
      supabase.from('comprovantes').select('*').order('created_at', { ascending: false }),
      supabase.from('lotes').select('*'),
      supabase.from('empreendimentos').select('*'),
      supabase.from('registros').select('id, lote_id'),
    ]);

    const empMap = new Map((empsData || []).map((e: { id: string; nome: string }) => [e.id, e.nome]));
    const loteMap = new Map((lotesData || []).map((l: { id: string; numero: string; empreendimento_id: string }) => [l.id, l]));
    const regMap = new Map((regsData || []).map((r: { id: string; lote_id: string }) => [r.lote_id, r.id]));

    const enriched = (compData || []).map((c: ComprovanteRow) => {
      const lote = loteMap.get(c.lote_id) as { numero: string; empreendimento_id: string } | undefined;
      return {
        ...c,
        lote_numero: lote?.numero || 'N/A',
        empreendimento_nome: lote ? (empMap.get(lote.empreendimento_id) || 'N/A') : 'N/A',
      };
    });

    setComprovantes(enriched);

    const loteOptions = (lotesData || []).map((l: { id: string; numero: string; empreendimento_id: string }) => ({
      id: l.id,
      numero: l.numero,
      empreendimento: empMap.get(l.empreendimento_id) || 'N/A',
      registro_id: regMap.get(l.id) || '',
    })).filter((l: LoteOption) => l.registro_id);

    setLotes(loteOptions);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!selectedLote || !url) return;
    setSaving(true);

    const lote = lotes.find((l) => l.id === selectedLote);
    if (!lote) return;

    await supabase.from('comprovantes').insert({
      registro_id: lote.registro_id,
      lote_id: lote.id,
      url,
      descricao: descricao || null,
      uploaded_by: profile?.id,
    });

    setDialogOpen(false);
    setSelectedLote('');
    setUrl('');
    setDescricao('');
    setSaving(false);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCheck className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Comprovantes</h1>
            <p className="text-zinc-500 text-sm">
              Comprovantes de ITBI vinculados automaticamente aos registros
            </p>
          </div>
        </div>

        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
                Novo Comprovante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Comprovante</DialogTitle>
                <DialogDescription>
                  O comprovante será vinculado automaticamente ao registro do lote selecionado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Lote</Label>
                  <Select value={selectedLote} onValueChange={setSelectedLote}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotes.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          Lote {l.numero} - {l.empreendimento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>URL do Comprovante</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Comprovante ITBI..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} disabled={!selectedLote || !url || saving}>
                  {saving ? 'Salvando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Comprovantes List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Lote</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Empreendimento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {comprovantes.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">Lote {c.lote_numero}</td>
                  <td className="px-4 py-3 text-zinc-300">{c.empreendimento_nome}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.descricao || '-'}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPreviewDoc({ url: c.url, title: `Comprovante - Lote ${c.lote_numero}` })}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={c.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {comprovantes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-600">
                    Nenhum comprovante cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {previewDoc && (
        <DocumentPreview
          url={previewDoc.url}
          title={previewDoc.title}
          open={true}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
