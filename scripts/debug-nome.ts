function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ll$/i, 'ii')
    .replace(/l$/i, 'i')
    .replace(/í/g, 'i')
    .replace(/ã/g, 'a')
    .replace(/ç/g, 'c')
    .replace(/é/g, 'e');
}

const nomes = [
  'Parque Lorena',
  'Parque Lorena l',
  'Parque Lorena I',
  'Parque Lorena II',
  'Parque Lorena ll',
  'Ilha dos Açores',
  'Aurora',
  'Montecarlo',
  'Montecarlo ',
];

console.log('Normalização de nomes:');
nomes.forEach(n => {
  console.log(`  "${n}" -> "${normalizarNome(n)}"`);
});
