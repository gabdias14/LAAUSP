/* Distribuição mensal das reservas de quadra do CEPEUSP pelo critério IPR.

   Implementa a proposta da gestão para o CdP (Arts. 35-A a 35-D, ainda não
   votados): Índice de Prioridade de Reserva de 0 a 100 e alocação em cinco
   regras, nesta ordem —
     1. horários da Seleção USP primeiro;
     2. 1 hora para cada pedido, dentro do horário pedido, antes de qualquer
        extensão;
     3. módulos atribuídos por IPR, do maior para o menor;
     4. sem espaço: deslocar até 1 hora, depois velódromo, depois meia quadra,
        sempre a partir do menor IPR;
     5. sem sorteio, e o mesmo técnico nunca em dois treinos ao mesmo tempo.
   O que sobra de espaço vira extensão para 1h30.

   Módulo puro, sem DOM: os horários são minutos desde a meia-noite. */

export const DURACAO = 60;
export const EXTENSAO = 30;
export const DESLOCAMENTO_MAXIMO = 60;
const PASSO = 30;

export const DIAS = [
  ["seg", "Segunda"], ["ter", "Terça"], ["qua", "Quarta"], ["qui", "Quinta"], ["sex", "Sexta"],
];

export function paraMinutos(hora) {
  const [h, m] = String(hora).split(":").map(Number);
  return h * 60 + (m || 0);
}

export function paraHora(minutos) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

/** Um time é a atlética (ou equipe combinada) numa modalidade. */
export function chaveDoTime(pedido) {
  return `${pedido.atletica}|${pedido.modalidade}`;
}

/**
 * IPR de um pedido, com a conta de cada inciso do Art. 35-A.
 *
 * Inciso I diz "proporcionalmente inversos às horas da modalidade". Lemos
 * assim: dentro da mesma modalidade, o time sem nenhuma hora de módulo leva
 * os 40 pontos e o que mais treinou em módulo leva zero, em escala linear.
 * O texto admite outras leituras — por isso a conta volta separada.
 */
export function calcularIPR(pedido, pedidos) {
  const daModalidade = pedidos.filter((p) => p.modalidade === pedido.modalidade);
  const maximo = Math.max(...daModalidade.map((p) => p.horasModulo || 0));
  const modulo = maximo > 0 ? 40 * (1 - (pedido.horasModulo || 0) / maximo) : 40;

  const odp = pedido.odp === 1 ? 25 : 0;

  const time = chaveDoTime(pedido);
  const unica = pedidos.filter((p) => chaveDoTime(p) === time).length === 1 ? 15 : 0;

  // Inciso IV olha só os dois meses anteriores.
  const semReserva = Math.min(2, pedido.mesesSemReserva || 0);
  const precario = Math.min(2 - semReserva, pedido.mesesVelodromoOuMeia || 0);
  const historico = semReserva * 10 + precario * 5;

  const partes = { modulo: Math.round(modulo * 10) / 10, odp, unica, historico };
  const total = Math.round((partes.modulo + odp + unica + historico) * 10) / 10;
  return { total, partes };
}

/** Ocupação de espaços e técnicos, por dia. */
function novaAgenda() {
  const intervalos = new Map();
  const ocupar = (chave, inicio, fim) => {
    if (!intervalos.has(chave)) intervalos.set(chave, []);
    intervalos.get(chave).push([inicio, fim]);
  };
  const livre = (chave, inicio, fim) =>
    !(intervalos.get(chave) || []).some(([a, b]) => inicio < b && a < fim);
  return { ocupar, livre };
}

/** Inícios possíveis para uma janela, do mais cedo ao mais tarde. */
function inicios(de, ate) {
  const lista = [];
  for (let t = de; t <= ate; t += PASSO) lista.push(t);
  return lista;
}

/**
 * Distribui os pedidos. Devolve uma reserva por pedido, na ordem de IPR, com
 * `situacao` dizendo por qual regra ela saiu e `motivo` em texto para a grade.
 */
export function alocar({ espacos, selecao = [], pedidos }) {
  const agenda = novaAgenda();
  const doEspaco = (dia, espaco) => `espaco|${dia}|${espaco}`;
  const doTecnico = (dia, tecnico) => `tecnico|${dia}|${tecnico}`;

  const reservasSelecao = selecao.map((bloco) => {
    const inicio = paraMinutos(bloco.inicio);
    const fim = paraMinutos(bloco.fim);
    agenda.ocupar(doEspaco(bloco.dia, bloco.espaco), inicio, fim);
    return { ...bloco, inicio, fim };
  });

  const comIPR = pedidos.map((pedido) => ({ pedido, ipr: calcularIPR(pedido, pedidos) }))
    .sort((a, b) => b.ipr.total - a.ipr.total || a.pedido.id.localeCompare(b.pedido.id));

  const cabe = (pedido, espaco, inicio, fim) =>
    inicio >= paraMinutos(espaco.abre) && fim <= paraMinutos(espaco.fecha) &&
    agenda.livre(doEspaco(pedido.dia, espaco.id), inicio, fim) &&
    (!pedido.tecnico || agenda.livre(doTecnico(pedido.dia, pedido.tecnico), inicio, fim));

  const reservar = (item, espaco, inicio, situacao) => {
    const { pedido } = item;
    agenda.ocupar(doEspaco(pedido.dia, espaco.id), inicio, inicio + DURACAO);
    if (pedido.tecnico) agenda.ocupar(doTecnico(pedido.dia, pedido.tecnico), inicio, inicio + DURACAO);
    item.reserva = { espaco: espaco.id, inicio, fim: inicio + DURACAO, situacao };
  };

  /* Cada etapa passa por todos os pedidos ainda sem reserva, do maior IPR
     para o menor, antes da etapa seguinte. Assim ninguém é deslocado enquanto
     houver um pedido de IPR maior ainda tentando o próprio horário — e quem
     acaba deslocado, no velódromo ou na meia quadra é sempre o de menor IPR. */
  const etapas = [
    { situacao: "no horário", tipo: "modulo", deslocar: false },
    { situacao: "deslocado", tipo: "modulo", deslocar: true },
    { situacao: "velódromo", tipo: "velodromo", deslocar: true },
    { situacao: "meia quadra", tipo: "meia", deslocar: true },
  ];

  for (const etapa of etapas) {
    const daEtapa = espacos.filter((e) => e.tipo === etapa.tipo);
    for (const item of comIPR) {
      if (item.reserva) continue;
      const de = paraMinutos(item.pedido.inicio);
      const ate = paraMinutos(item.pedido.fim) - DURACAO;
      let candidatos = inicios(de, ate);
      if (etapa.deslocar) {
        const fora = inicios(de - DESLOCAMENTO_MAXIMO, ate + DESLOCAMENTO_MAXIMO)
          .filter((t) => t < de || t > ate)
          .sort((a, b) => Math.min(Math.abs(a - de), Math.abs(a - ate)) -
            Math.min(Math.abs(b - de), Math.abs(b - ate)) || a - b);
        // Fora do módulo, o horário pedido ainda vem antes do deslocado.
        candidatos = etapa.tipo === "modulo" ? fora : [...candidatos, ...fora];
      }
      achar: for (const inicio of candidatos) {
        for (const espaco of daEtapa) {
          if (cabe(item.pedido, espaco, inicio, inicio + DURACAO)) {
            const fora = inicio < de || inicio > ate;
            const situacao = etapa.tipo === "modulo" ? etapa.situacao
              : `${etapa.situacao}${fora ? " (deslocado)" : ""}`;
            reservar(item, espaco, inicio, situacao);
            break achar;
          }
        }
      }
    }
  }

  // Extensão para 1h30, de novo por IPR: primeiro depois, depois antes.
  for (const item of comIPR) {
    const r = item.reserva;
    if (!r) continue;
    const espaco = espacos.find((e) => e.id === r.espaco);
    const { pedido } = item;
    const janelaFim = Math.max(paraMinutos(pedido.fim), r.fim);
    const janelaInicio = Math.min(paraMinutos(pedido.inicio), r.inicio);
    const tentativas = [[r.fim, r.fim + EXTENSAO], [r.inicio - EXTENSAO, r.inicio]]
      .filter(([a, b]) => a >= janelaInicio && b <= janelaFim);
    for (const [a, b] of tentativas) {
      if (cabe(pedido, espaco, a, b)) {
        agenda.ocupar(doEspaco(pedido.dia, espaco.id), a, b);
        if (pedido.tecnico) agenda.ocupar(doTecnico(pedido.dia, pedido.tecnico), a, b);
        r.inicio = Math.min(r.inicio, a);
        r.fim = Math.max(r.fim, b);
        r.estendida = true;
        break;
      }
    }
  }

  const reservas = comIPR.map(({ pedido, ipr, reserva }) => ({
    pedido,
    ipr,
    ...(reserva || { espaco: null, inicio: null, fim: null, situacao: "sem reserva" }),
    estendida: Boolean(reserva?.estendida),
  }));
  return { reservas, selecao: reservasSelecao };
}

/** Contagem por situação, para o resumo da grade. */
export function resumir(reservas) {
  const contagem = {};
  for (const r of reservas) contagem[r.situacao] = (contagem[r.situacao] || 0) + 1;
  return contagem;
}
