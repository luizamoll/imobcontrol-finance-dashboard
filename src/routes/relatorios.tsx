import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore, comissaoDaVenda } from "@/lib/store";
import { brl, brl0, formatDate } from "@/lib/format";
import { useTenant } from "@/lib/tenant";
import {
  exportReportExcel,
  exportReportPdf,
  type ReportExportData,
} from "@/lib/report-export";

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
  head: () => ({ meta: [{ title: "Relatórios · ImobControl" }] }),
});

type ReportType = "vendas" | "recebimentos" | "comissoes" | "carteira" | "socios" | "parcelas_cliente";

function RelatoriosPage() {
  const { state } = useStore();
  const { empresaAtual } = useTenant();
  const [tipo, setTipo] = useState<ReportType>("recebimentos");
  const [empId, setEmpId] = useState("todos");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [clienteId, setClienteId] = useState("todos");

  const clientesRelatorio = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const parcela of state.parcelas) {
      if (parcela.clienteId) mapa.set(parcela.clienteId, parcela.compradorNome);
    }
    return [...mapa.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [state.parcelas]);

  const rows = useMemo(() => {
    if (tipo === "vendas") {
      return state.vendas
        .filter((v) => (empId === "todos" ? true : v.empreendimentoId === empId))
        .filter((v) => (inicio ? v.dataContrato >= inicio : true))
        .filter((v) => (fim ? v.dataContrato <= fim : true));
    }
    if (tipo === "parcelas_cliente") {
      const itens = rows as typeof state.parcelas;
      const totalPago = itens.reduce((soma, item) => soma + item.valorPago, 0);
      const totalAcrescimos = itens.reduce(
        (soma, item) => soma + Math.max(0, item.valorPago - item.valor),
        0,
      );
      return {
        title: "Relatório de Parcelas Pagas por Cliente",
        company: empresaAtual?.nome,
        filters: filtros,
        generatedAt,
        fileBaseName: "relatorio-parcelas-pagas-cliente",
        summary: [
          `Parcelas pagas: ${itens.length}`,
          `Total pago: ${brl(totalPago)} · Acréscimos: ${brl(totalAcrescimos)}`,
        ],
        columns: [
          { key: "pagamento", label: "Pagamento", width: 0.9 },
          { key: "cliente", label: "Cliente", width: 1.7 },
          { key: "empreendimento", label: "Empreendimento", width: 1.5 },
          { key: "parcela", label: "Parcela", width: 0.8 },
          { key: "vencimento", label: "Vencimento", width: 0.9 },
          { key: "principal", label: "Valor original", width: 1.0, align: "right", kind: "currency" },
          { key: "acrescimos", label: "Juros/multa", width: 1.0, align: "right", kind: "currency" },
          { key: "pago", label: "Valor pago", width: 1.0, align: "right", kind: "currency" },
        ],
        rows: itens.map((p) => ({
          pagamento: formatDate(p.dataPagamento),
          cliente: p.compradorNome,
          empreendimento:
            state.empreendimentos.find((e) => e.id === p.empreendimentoId)?.nome ?? "—",
          parcela: `${p.numero}/${p.totalParcelas}`,
          vencimento: formatDate(p.vencimento),
          principal: p.valor,
          acrescimos: Math.max(0, p.valorPago - p.valor),
          pago: p.valorPago,
        })),
      };
    }

    if (tipo === "socios") {
      const itens = rows as Array<{
        socio: string;
        recebimentos: number;
        bruto: number;
        destinado: number;
        empreendimentos: string;
      }>;
      return {
        title: "Relatório de Sócios",
        company: empresaAtual?.nome,
        filters: filtros,
        generatedAt,
        fileBaseName: "relatorio-socios",
        summary: [
          `Sócios: ${itens.length}`,
          `Total destinado aos sócios: ${brl(itens.reduce((soma, item) => soma + item.destinado, 0))}`,
        ],
        columns: [
          { key: "socio", label: "Sócio", width: 1.5 },
          { key: "empreendimentos", label: "Empreendimentos", width: 2.0 },
          { key: "recebimentos", label: "Recebimentos", width: 0.9, align: "right" },
          { key: "bruto", label: "Bruto recebido", width: 1.2, align: "right", kind: "currency" },
          { key: "destinado", label: "Destinado ao sócio", width: 1.2, align: "right", kind: "currency" },
        ],
        rows: itens,
      };
    }

    if (tipo === "recebimentos") {
      return state.parcelas
        .filter((p) => p.status === "paga")
        .filter((p) => (empId === "todos" ? true : p.empreendimentoId === empId))
        .filter((p) => (inicio && p.dataPagamento ? p.dataPagamento >= inicio : true))
        .filter((p) => (fim && p.dataPagamento ? p.dataPagamento <= fim : true));
    }
    if (tipo === "comissoes") {
      const porCorretor = new Map<string, {
        corretor: string;
        contratos: number;
        total: number;
        pago: number;
        saldo: number;
      }>();
      for (const venda of state.vendas
        .filter((v) => (empId === "todos" ? true : v.empreendimentoId === empId))
        .filter((v) => (inicio ? v.dataContrato >= inicio : true))
        .filter((v) => (fim ? v.dataContrato <= fim : true))) {
        const nome = venda.corretorNome || "Sem corretor";
        const comissao = comissaoDaVenda(
          venda,
          state.parcelas,
          state.config,
          state.movimentos,
        );
        const atual = porCorretor.get(nome) ?? {
          corretor: nome,
          contratos: 0,
          total: 0,
          pago: 0,
          saldo: 0,
        };
        atual.contratos += 1;
        atual.total += comissao.total;
        atual.pago += comissao.pago;
        atual.saldo += comissao.saldo;
        porCorretor.set(nome, atual);
      }
      return [...porCorretor.values()].sort((a, b) => b.saldo - a.saldo);
    }
    if (tipo === "socios") {
      const porSocio = new Map<string, {
        socio: string;
        recebimentos: number;
        bruto: number;
        destinado: number;
        empreendimentos: Set<string>;
      }>();
      for (const movimento of state.movimentos
        .filter((m) => (empId === "todos" ? true : m.empreendimentoId === empId))
        .filter((m) => (inicio ? m.data >= inicio : true))
        .filter((m) => (fim ? m.data <= fim : true))) {
        const empreendimento = state.empreendimentos.find((e) => e.id === movimento.empreendimentoId);
        const nome = movimento.socioNome || empreendimento?.socioNome || "Não identificado";
        const atual = porSocio.get(nome) ?? {
          socio: nome,
          recebimentos: 0,
          bruto: 0,
          destinado: 0,
          empreendimentos: new Set<string>(),
        };
        atual.recebimentos += 1;
        atual.bruto += movimento.valorRecebido;
        atual.destinado += movimento.socioValor;
        if (empreendimento?.nome) atual.empreendimentos.add(empreendimento.nome);
        porSocio.set(nome, atual);
      }
      return [...porSocio.values()]
        .map((item) => ({
          ...item,
          empreendimentos: [...item.empreendimentos].join(", ") || "—",
        }))
        .sort((a, b) => b.destinado - a.destinado);
    }
    if (tipo === "parcelas_cliente") {
      return state.parcelas
        .filter((p) => p.status === "paga")
        .filter((p) => (empId === "todos" ? true : p.empreendimentoId === empId))
        .filter((p) => (clienteId === "todos" ? true : p.clienteId === clienteId))
        .filter((p) => (inicio && p.dataPagamento ? p.dataPagamento >= inicio : true))
        .filter((p) => (fim && p.dataPagamento ? p.dataPagamento <= fim : true));
    }
    return state.empreendimentos.filter((e) => (empId === "todos" ? true : e.id === empId));
  }, [tipo, empId, clienteId, inicio, fim, state]);

  const montarExportacao = (): ReportExportData => {
    const empreendimentoNome =
      empId === "todos"
        ? "Todos os empreendimentos"
        : state.empreendimentos.find((e) => e.id === empId)?.nome ?? "Empreendimento selecionado";

    const periodo =
      tipo === "carteira"
        ? "Posição atual da carteira"
        : inicio || fim
          ? `Período: ${inicio ? formatDate(inicio) : "início"} até ${fim ? formatDate(fim) : "hoje"}`
          : "Período: todos";

    const filtros = `Empreendimento: ${empreendimentoNome} · ${periodo}`;
    const generatedAt = new Date().toLocaleString("pt-BR");

    if (tipo === "recebimentos") {
      const itens = rows as typeof state.parcelas;
      const total = itens.reduce((soma, item) => soma + item.valorPago, 0);
      return {
        title: "Relatório de Recebimentos",
        company: empresaAtual?.nome,
        filters: filtros,
        generatedAt,
        fileBaseName: "relatorio-recebimentos",
        summary: [
          `Registros: ${itens.length}`,
          `Total recebido: ${brl(total)}`,
        ],
        columns: [
          { key: "data", label: "Data", width: 0.9 },
          { key: "cliente", label: "Cliente", width: 1.8 },
          { key: "empreendimento", label: "Empreendimento", width: 1.5 },
          { key: "socio", label: "Sócio", width: 1.3 },
          { key: "origem", label: "Origem", width: 1.4 },
          { key: "valor", label: "Valor recebido", width: 1.2, align: "right", kind: "currency" },
        ],
        rows: itens.map((p) => ({
          data: formatDate(p.dataPagamento),
          cliente: p.compradorNome,
          empreendimento:
            state.empreendimentos.find((e) => e.id === p.empreendimentoId)?.nome ?? "—",
          socio:
            state.movimentos
              .filter((movimento) => movimento.parcelaId === p.id)
              .at(-1)?.socioNome
            ?? state.empreendimentos.find((e) => e.id === p.empreendimentoId)?.socioNome
            ?? "—",
          origem: p.origemDescricao,
          valor: p.valorPago,
        })),
      };
    }

    if (tipo === "vendas") {
      const itens = rows as typeof state.vendas;
      const total = itens.reduce((soma, item) => soma + item.valorTotal, 0);
      return {
        title: "Relatório de Vendas",
        company: empresaAtual?.nome,
        filters: filtros,
        generatedAt,
        fileBaseName: "relatorio-vendas",
        summary: [
          `Vendas: ${itens.length}`,
          `Valor total vendido: ${brl(total)}`,
        ],
        columns: [
          { key: "data", label: "Data", width: 0.9 },
          { key: "comprador", label: "Comprador", width: 1.8 },
          { key: "empreendimento", label: "Empreendimento", width: 1.5 },
          { key: "unidade", label: "Unidade", width: 1.0 },
          { key: "socio", label: "Sócio", width: 1.3 },
          { key: "corretor", label: "Corretor", width: 1.3 },
          { key: "imovel", label: "Valor imóvel", width: 1.1, align: "right", kind: "currency" },
          { key: "corretagem", label: "Corretagem", width: 1.0, align: "right", kind: "currency" },
          { key: "valor", label: "Total contrato", width: 1.1, align: "right", kind: "currency" },
        ],
        rows: itens.map((v) => {
          const unidade = state.matriculas.find((m) => m.id === v.matriculaId);
          return {
            data: formatDate(v.dataContrato),
            comprador: v.compradorNome,
            empreendimento:
              state.empreendimentos.find((e) => e.id === v.empreendimentoId)?.nome ?? "—",
            unidade: unidade ? `${unidade.numero} · ${unidade.unidade}` : "—",
            socio: v.regras?.socioNome || "—",
            corretor: v.corretorNome || "—",
            imovel: v.valorImovel ?? null,
            corretagem: v.corretagemValor ?? null,
            valor: v.valorTotal,
          };
        }),
      };
    }

    if (tipo === "comissoes") {
      const itens = rows as Array<{
        corretor: string;
        contratos: number;
        total: number;
        pago: number;
        saldo: number;
      }>;
      const total = itens.reduce((soma, item) => soma + item.total, 0);
      const pago = itens.reduce((soma, item) => soma + item.pago, 0);
      const saldo = itens.reduce((soma, item) => soma + item.saldo, 0);
      return {
        title: "Relatório de Comissões a Receber por Corretor",
        company: empresaAtual?.nome,
        filters: filtros,
        generatedAt,
        fileBaseName: "relatorio-comissoes-a-receber",
        summary: [
          `Comissão total: ${brl(total)}`,
          `Repassado: ${brl(pago)} · A receber: ${brl(saldo)}`,
        ],
        columns: [
          { key: "corretor", label: "Corretor", width: 1.7 },
          { key: "contratos", label: "Contratos", width: 0.8, align: "right" },
          { key: "total", label: "Comissão total", width: 1.2, align: "right", kind: "currency" },
          { key: "pago", label: "Já repassado", width: 1.2, align: "right", kind: "currency" },
          { key: "saldo", label: "A receber", width: 1.2, align: "right", kind: "currency" },
        ],
        rows: itens,
      };
    }

    const itens = rows as typeof state.empreendimentos;
    const dados = itens.map((e) => {
      const vendido = state.vendas
        .filter((v) => v.empreendimentoId === e.id)
        .reduce((soma, venda) => soma + venda.valorTotal, 0);
      const recebido = state.parcelas
        .filter((p) => p.empreendimentoId === e.id)
        .reduce((soma, parcela) => soma + parcela.valorPago, 0);
      return {
        empreendimento: e.nome,
        socio: e.socioNome || "—",
        vgv: e.valorTotal,
        vendido,
        recebido,
        saldo: Math.max(0, vendido - recebido),
      };
    });

    return {
      title: "Relatório de Carteira por Empreendimento",
      company: empresaAtual?.nome,
      filters: filtros,
      generatedAt,
      fileBaseName: "relatorio-carteira",
      summary: [
        `VGV: ${brl(dados.reduce((soma, item) => soma + item.vgv, 0))}`,
        `Vendido: ${brl(dados.reduce((soma, item) => soma + item.vendido, 0))} · Recebido: ${brl(dados.reduce((soma, item) => soma + item.recebido, 0))}`,
      ],
      columns: [
        { key: "empreendimento", label: "Empreendimento", width: 1.9 },
        { key: "socio", label: "Sócio atual", width: 1.4 },
        { key: "vgv", label: "VGV", width: 1.2, align: "right", kind: "currency" },
        { key: "vendido", label: "Vendas", width: 1.2, align: "right", kind: "currency" },
        { key: "recebido", label: "Recebido", width: 1.2, align: "right", kind: "currency" },
        { key: "saldo", label: "Saldo", width: 1.2, align: "right", kind: "currency" },
      ],
      rows: dados,
    };
  };

  const doExport = (fmt: "PDF" | "Excel") => {
    try {
      const dados = montarExportacao();
      if (fmt === "PDF") exportReportPdf(dados);
      else exportReportExcel(dados);

      toast.success(`${fmt} gerado com sucesso`, {
        description: `${dados.rows.length} registro(s) exportado(s) com os filtros atuais.`,
      });
    } catch (error) {
      toast.error(`Não foi possível gerar o ${fmt}`, {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Análises"
        title="Relatórios"
        description="Extraia relatórios gerenciais de vendas, recebimentos, sócios, comissões e parcelas pagas por cliente."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => doExport("PDF")}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={() => doExport("Excel")}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
          </>
        }
      />

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-5">
          <div>
            <Label>Tipo de relatório</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as ReportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recebimentos">Recebimentos</SelectItem>
                <SelectItem value="vendas">Vendas</SelectItem>
                <SelectItem value="comissoes">Comissões a receber por corretor</SelectItem>
                <SelectItem value="socios">Sócios</SelectItem>
                <SelectItem value="parcelas_cliente">Parcelas pagas por cliente</SelectItem>
                <SelectItem value="carteira">Carteira por empreendimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Empreendimento</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {state.empreendimentos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tipo === "parcelas_cliente" && (
            <div>
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientesRelatorio.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Data inicial</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} disabled={tipo === "carteira"} />
          </div>
          <div>
            <Label>Data final</Label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} disabled={tipo === "carteira"} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="h-4 w-4 text-primary" />
            {tipo === "recebimentos" && "Recebimentos"}
            {tipo === "vendas" && "Vendas"}
            {tipo === "comissoes" && "Comissões a receber por corretor"}
            {tipo === "socios" && "Sócios"}
            {tipo === "parcelas_cliente" && "Parcelas pagas por cliente"}
            {tipo === "carteira" && "Carteira por empreendimento"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tipo === "recebimentos" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as typeof state.parcelas).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.dataPagamento)}</TableCell>
                    <TableCell>{p.compradorNome}</TableCell>
                    <TableCell>{state.empreendimentos.find((e) => e.id === p.empreendimentoId)?.nome}</TableCell>
                    <TableCell>{p.origemDescricao}</TableCell>
                    <TableCell className="text-right">{brl0(p.valorPago)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tipo === "vendas" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as typeof state.vendas).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{formatDate(v.dataContrato)}</TableCell>
                    <TableCell>{v.compradorNome}</TableCell>
                    <TableCell>{state.empreendimentos.find((e) => e.id === v.empreendimentoId)?.nome}</TableCell>
                    <TableCell>{v.corretorNome}</TableCell>
                    <TableCell className="text-right">{brl0(v.valorTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tipo === "comissoes" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corretor</TableHead>
                  <TableHead className="text-right">Contratos</TableHead>
                  <TableHead className="text-right">Comissão total</TableHead>
                  <TableHead className="text-right">Já repassado</TableHead>
                  <TableHead className="text-right">A receber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as Array<{ corretor: string; contratos: number; total: number; pago: number; saldo: number }>).map((item) => (
                  <TableRow key={item.corretor}>
                    <TableCell>{item.corretor}</TableCell>
                    <TableCell className="text-right">{item.contratos}</TableCell>
                    <TableCell className="text-right">{brl0(item.total)}</TableCell>
                    <TableCell className="text-right text-success">{brl0(item.pago)}</TableCell>
                    <TableCell className="text-right">{brl0(item.saldo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tipo === "socios" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sócio</TableHead>
                  <TableHead>Empreendimentos</TableHead>
                  <TableHead className="text-right">Recebimentos</TableHead>
                  <TableHead className="text-right">Bruto recebido</TableHead>
                  <TableHead className="text-right">Destinado ao sócio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as Array<{ socio: string; empreendimentos: string; recebimentos: number; bruto: number; destinado: number }>).map((item) => (
                  <TableRow key={item.socio}>
                    <TableCell className="font-medium">{item.socio}</TableCell>
                    <TableCell>{item.empreendimentos}</TableCell>
                    <TableCell className="text-right">{item.recebimentos}</TableCell>
                    <TableCell className="text-right">{brl0(item.bruto)}</TableCell>
                    <TableCell className="text-right text-success">{brl0(item.destinado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tipo === "parcelas_cliente" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Juros/multa</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as typeof state.parcelas).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.dataPagamento)}</TableCell>
                    <TableCell>{p.compradorNome}</TableCell>
                    <TableCell>{state.empreendimentos.find((e) => e.id === p.empreendimentoId)?.nome ?? "—"}</TableCell>
                    <TableCell>{p.numero}/{p.totalParcelas}</TableCell>
                    <TableCell>{formatDate(p.vencimento)}</TableCell>
                    <TableCell className="text-right">{brl0(p.valor)}</TableCell>
                    <TableCell className="text-right">{brl0(Math.max(0, p.valorPago - p.valor))}</TableCell>
                    <TableCell className="text-right text-success">{brl0(p.valorPago)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tipo === "carteira" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead className="text-right">VGV</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as typeof state.empreendimentos).map((e) => {
                  const vendido = state.vendas.filter((v) => v.empreendimentoId === e.id).reduce((a, v) => a + v.valorTotal, 0);
                  const recebido = state.parcelas.filter((p) => p.empreendimentoId === e.id).reduce((a, p) => a + p.valorPago, 0);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nome}</TableCell>
                      <TableCell className="text-right">{brl0(e.valorTotal)}</TableCell>
                      <TableCell className="text-right">{brl0(vendido)}</TableCell>
                      <TableCell className="text-right text-success">{brl0(recebido)}</TableCell>
                      <TableCell className="text-right">{brl0(Math.max(0, vendido - recebido))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
