import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCliente } from '../src/clientes.js';

const bad = (status, message) => Object.assign(new Error(message), { status });

test('normaliza CPF e CEP sem alterar dados pessoais adicionais', () => {
  const c = normalizarCliente({
    nome: '  Ana Souza  ', cpf: '529.982.247-25', cep: '30123-456',
    uf: 'mg', email: 'ana@example.com', telefone: ' 31999999999 '
  }, bad);
  assert.equal(c.nome, 'Ana Souza');
  assert.equal(c.cpf, '52998224725');
  assert.equal(c.cep, '30123456');
  assert.equal(c.uf, 'MG');
  assert.equal(c.telefone, '31999999999');
  assert.equal(c.estado_civil, null);
});

test('bloqueia CPF invalido e repetido', () => {
  assert.throws(() => normalizarCliente({ nome: 'Cliente', cpf: '11111111111' }, bad), /CPF invalido/);
  assert.throws(() => normalizarCliente({ nome: 'Cliente', cpf: '12345678901' }, bad), /CPF invalido/);
});

test('bloqueia dados inconsistentes', () => {
  assert.throws(() => normalizarCliente({ nome: '' }, bad), /Informe o nome/);
  assert.throws(() => normalizarCliente({ nome: 'A', cep: '123' }, bad), /CEP invalido/);
  assert.throws(() => normalizarCliente({ nome: 'A', uf: 'XX' }, bad), /UF invalida/);
  assert.throws(() => normalizarCliente({ nome: 'A', telefone: 1234 }, bad), /Campo invalido/);
  assert.throws(() => normalizarCliente({ nome: 'A', email: 'invalido' }, bad), /E-mail invalido/);
});
