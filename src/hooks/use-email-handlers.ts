'use client';

import { useMemo } from 'react';
import type { RegistroCompleto } from '@/types';

/**
 * Handlers de envio de e-mail (boleto ITBI / OP de registro → Laís; matrícula → cliente).
 * Compartilhado entre as telas Registros e Em Andamento para que o comportamento seja
 * idêntico nas duas (evita o bug de "envia numa tela e não na outra").
 */
export function useEmailHandlers() {
  return useMemo(() => {
    const handleSendBoleto = async (item: RegistroCompleto, url: string) => {
      if (!url) return;
      try {
        const response = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'boleto_itbi',
            loteNumero: item.lote.numero,
            clienteNome: item.contrato?.cliente_nome || '',
            empreendimento: item.empreendimento.nome,
            url,
          }),
        });
        if (!response.ok) throw new Error('Falha ao enviar e-mail');
        alert('E-mail com boleto ITBI enviado para Laís!');
      } catch (err) {
        console.error('Erro ao enviar e-mail:', err);
        alert('Erro ao enviar e-mail do boleto ITBI. Tente novamente.');
      }
    };

    const handleSendOP = async (item: RegistroCompleto, url: string) => {
      if (!url) return;
      try {
        const response = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'op_registro',
            loteNumero: item.lote.numero,
            clienteNome: item.contrato?.cliente_nome || '',
            empreendimento: item.empreendimento.nome,
            url,
          }),
        });
        if (!response.ok) throw new Error('Falha ao enviar e-mail');
        alert('E-mail com OP de registro enviado para Laís!');
      } catch (err) {
        console.error('Erro ao enviar e-mail:', err);
        alert('Erro ao enviar e-mail da OP de registro. Tente novamente.');
      }
    };

    const handleSendMatricula = async (item: RegistroCompleto) => {
      if (!item.registro.matricula_url || !item.contrato?.cliente_email) return;
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'matricula',
            clienteNome: item.contrato.cliente_nome,
            clienteEmail: item.contrato.cliente_email,
            loteNumero: item.lote.numero,
            empreendimento: item.empreendimento.nome,
            url: item.registro.matricula_url,
          }),
        });
        alert('E-mail com matrícula enviado ao cliente!');
      } catch (err) {
        console.error('Erro ao enviar e-mail:', err);
      }
    };

    return { handleSendBoleto, handleSendOP, handleSendMatricula };
  }, []);
}
