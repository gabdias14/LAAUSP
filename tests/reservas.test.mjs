/* Testes da distribuição de reservas (assets/js/reservas.js).
   Rodar com: node --test tests/*.test.mjs */

import test from "node:test";
import assert from "node:assert/strict";
import { alocar, calcularIPR, paraHora } from "../assets/js/reservas.js";

const modulo = (id) => ({ id, nome: id, tipo: "modulo", abre: "17:00", fecha: "23:00" });
const velodromo = { id: "VEL", nome: "Velódromo", tipo: "velodromo", abre: "17:00", fecha: "23:00" };
const meia = { id: "MQ", nome: "Meia quadra", tipo: "meia", abre: "17:00", fecha: "23:00" };

let seq = 0;
function pedido(extra) {
  seq += 1;
  return {
    id: `P${String(seq).padStart(2, "0")}`, atletica: `A${seq}`, modalidade: "Handebol M",
    tecnico: `T${seq}`, dia: "ter", inicio: "19:00", fim: "20:00", odp: 2,
    horasModulo: 10, mesesSemReserva: 0, mesesVelodromoOuMeia: 0, ...extra,
  };
}

const porId = (reservas, id) => reservas.find((r) => r.pedido.id === id);
const horario = (r) => `${paraHora(r.inicio)}-${paraHora(r.fim)}`;

test("IPR soma os quatro incisos e chega a 100 no máximo", () => {
  const a = pedido({ horasModulo: 0, odp: 1, mesesSemReserva: 2, mesesVelodromoOuMeia: 2 });
  const b = pedido({ horasModulo: 40 });
  const { total, partes } = calcularIPR(a, [a, b]);
  assert.deepEqual(partes, { modulo: 40, odp: 25, unica: 15, historico: 20 });
  assert.equal(total, 100);
});

test("inciso I é linear dentro da modalidade e ignora as outras", () => {
  const a = pedido({ horasModulo: 10 });
  const b = pedido({ horasModulo: 20 });
  const outra = pedido({ modalidade: "Futsal F", horasModulo: 200 });
  assert.equal(calcularIPR(a, [a, b, outra]).partes.modulo, 20);
  assert.equal(calcularIPR(b, [a, b, outra]).partes.modulo, 0);
});

test("inciso III só vale para quem tem um único pedido na semana", () => {
  const a = pedido({ atletica: "X", dia: "seg" });
  const b = pedido({ atletica: "X", dia: "qua" });
  const c = pedido();
  assert.equal(calcularIPR(a, [a, b, c]).partes.unica, 0);
  assert.equal(calcularIPR(c, [a, b, c]).partes.unica, 15);
});

test("horário da Seleção USP fica bloqueado", () => {
  const p = pedido({ inicio: "19:00", fim: "21:00" });
  const { reservas } = alocar({
    espacos: [modulo("M1")],
    selecao: [{ dia: "ter", espaco: "M1", inicio: "19:00", fim: "20:00" }],
    pedidos: [p],
  });
  assert.equal(horario(porId(reservas, p.id)), "20:00-21:00");
});

test("quem tem menor IPR é o deslocado, depois velódromo, meia quadra e sem reserva", () => {
  const ps = [
    pedido({ horasModulo: 0, odp: 1 }),
    pedido({ horasModulo: 10, odp: 1 }),
    pedido({ horasModulo: 20, odp: 1 }),
    pedido({ horasModulo: 30, odp: 1 }),
    pedido({ horasModulo: 40, odp: 1 }),
  ];
  // Só 19h às 21h no módulo: um cabe no horário e um deslocado em até 1h.
  const espacos = [{ ...modulo("M1"), abre: "19:00", fecha: "21:00" },
    { ...velodromo, abre: "19:00", fecha: "20:00" }, { ...meia, abre: "19:00", fecha: "20:00" }];
  const { reservas } = alocar({ espacos, pedidos: ps });
  assert.deepEqual(reservas.map((r) => r.situacao),
    ["no horário", "deslocado", "velódromo", "meia quadra", "sem reserva"]);
  assert.deepEqual(reservas.map((r) => r.pedido.id), ps.map((p) => p.id));
});

test("1 hora para todos antes de qualquer extensão", () => {
  const a = pedido({ horasModulo: 0, inicio: "19:00", fim: "21:00" });
  const b = pedido({ horasModulo: 40, inicio: "19:00", fim: "21:00" });
  const { reservas } = alocar({ espacos: [{ ...modulo("M1"), abre: "19:00", fecha: "21:00" }], pedidos: [a, b] });
  assert.equal(horario(porId(reservas, a.id)), "19:00-20:00");
  assert.equal(horario(porId(reservas, b.id)), "20:00-21:00");
  assert.ok(reservas.every((r) => !r.estendida));
});

test("sobrando espaço, a reserva vira 1h30", () => {
  const a = pedido({ inicio: "19:00", fim: "21:00" });
  const { reservas } = alocar({ espacos: [modulo("M1")], pedidos: [a] });
  assert.equal(horario(reservas[0]), "19:00-20:30");
  assert.equal(reservas[0].estendida, true);
});

test("o mesmo técnico nunca fica em dois treinos ao mesmo tempo", () => {
  const a = pedido({ tecnico: "Fulano", horasModulo: 0 });
  const b = pedido({ tecnico: "Fulano", horasModulo: 40 });
  const { reservas } = alocar({ espacos: [modulo("M1"), modulo("M2")], pedidos: [a, b] });
  const [ra, rb] = [porId(reservas, a.id), porId(reservas, b.id)];
  assert.equal(horario(ra), "19:00-20:00");
  assert.ok(rb.inicio >= ra.fim || rb.fim <= ra.inicio, `sobrepôs: ${horario(rb)}`);
});
