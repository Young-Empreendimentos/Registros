'use client';

import { useState } from 'react';
import { useProfile } from '@/hooks/use-profile';
import { useComprovantes } from '@/contexts/comprovantes-context';
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
import { STICKY_LOTE_EMP, STICKY_SHADOW } from '@/lib/sticky-table-columns';
import { FileCheck, Plus, ExternalLink, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ComprovantesPage() {
  const { comprovantes, lotes, loading, refetch } = useComprovantes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<string>('');
  const [url, setUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const { profile } = useProfile();
  const canEdit = profile?.role !== 'leitor';

  const handleAdd = async () => {
    if (!selectedLote || !url) return;
    setSaving(true);

    const lote = lotes.find((l) => l.id === selectedLote);
    if (!lote) return;

    try {
      await fetch('/api/comprovantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lote_id: lote.id,
          registro_id: lote.registro_id,
          url,
          descricao: descricao || null,
        }),
      });

      setDialogOpen(false);
      setSelectedLote('');
      setUrl('');
      setDescricao('');
      void refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCheck className="w-6 h-6 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-orange-950">Comprovantes</h1>
            <p className="text-orange-700 text-sm">
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
      {loading && comprovantes.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-orange-200 bg-white overflow-hidden shadow-sm">
          <div className="w-full overflow-auto max-h-[calc(100vh-14rem)]">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[700px]">
            <thead>
              <tr className="border-b border-orange-200 bg-orange-50">
                <th
                  className={`sticky left-0 top-0 z-30 px-4 py-3 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider ${STICKY_SHADOW}`}
                  style={{ background: '#fff7ed', width: STICKY_LOTE_EMP.col1Width, minWidth: 120 }}
                >
                  Lote
                </th>
                <th
                  className={`sticky top-0 z-30 px-4 py-3 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider ${STICKY_SHADOW}`}
                  style={{
                    background: '#fff7ed',
                    left: STICKY_LOTE_EMP.col2Left,
                    width: STICKY_LOTE_EMP.col2Width,
                    minWidth: STICKY_LOTE_EMP.col2Width,
                  }}
                >
                  Empreendimento
                </th>
                <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider" style={{ background: '#fff7ed' }}>Descrição</th>
                <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold text-orange-800 uppercase tracking-wider" style={{ background: '#fff7ed' }}>Data</th>
                <th className="sticky top-0 z-20 px-4 py-3 text-center text-xs font-semibold text-orange-800 uppercase tracking-wider" style={{ background: '#fff7ed' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {comprovantes.map((c) => (
                <tr
                  key={c.id}
                  className="group border-b border-orange-100 transition-colors"
                >
                  <td
                    className={`sticky left-0 z-20 px-4 py-3 text-gray-900 font-medium bg-white ${STICKY_SHADOW} group-hover:bg-orange-50`}
                    style={{ width: STICKY_LOTE_EMP.col1Width, minWidth: 120 }}
                  >
                    Lote {c.lote_numero}
                  </td>
                  <td
                    className={`sticky z-20 px-4 py-3 text-gray-700 bg-white ${STICKY_SHADOW} group-hover:bg-orange-50`}
                    style={{
                      left: STICKY_LOTE_EMP.col2Left,
                      width: STICKY_LOTE_EMP.col2Width,
                      minWidth: STICKY_LOTE_EMP.col2Width,
                    }}
                  >
                    {c.empreendimento_nome}
                  </td>
                  <td className="px-4 py-3 text-gray-600 group-hover:bg-orange-50">{c.descricao || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs group-hover:bg-orange-50">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 group-hover:bg-orange-50">
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
                  <td colSpan={5} className="px-4 py-12 text-center text-orange-600">
                    Nenhum comprovante cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
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
