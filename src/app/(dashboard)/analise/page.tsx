import { redirect } from 'next/navigation';

// A aba Análise foi aposentada: tudo que ela fazia (editar etapa manual e
// andamento das linhas em andamento) agora vive no desdobrável da tela
// Em Andamento. Mantemos a rota redirecionando pra não quebrar links salvos.
export default function AnalisePage() {
  redirect('/ativos');
}
