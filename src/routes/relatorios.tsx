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
import { brl0, formatDate } from "@/lib/format";

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
  head: () => ({ meta: [{ title: "Relatórios · ImobControl" }] }),
});

type ReportType = "vendas" | "recebimentos" | "comissoes" | "carteira";

function RelatoriosPage() {
  const { state } = useStore();
  const [tipo, setTipo] = useState<ReportType>("recebimentos");
  const [empId, setEmpId] = useState("todos");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const rows = useMemo(() => {
    if (tipo === "vendas") {
      return state.vendas
        .filter((v) => (empId === "todos" ? true : v.empreendimentoId === empId))
        .filter((v) => (inicio ? v.dataContrato >= inicio : true))
        .filter((v) => (fim ? v.dataContrato <= fim : true));
    }
    if (tipo === "recebimentos") {
      return state.parcelas
        .filter((p) => p.status === "paga")
        .filter((p) => (empId === "todos" ? true : p.empreendimentoId === empId))
        .filter((p) => (inicio && p.dataPagamento ? p.dataPagamento >= inicio : true))
        .filter((p) => (fim && p.dataPagamento ? p.dataPagamento <= fim : true));
    }
    if (tipo === "comissoes") {
      return state.vendas.map((v) => ({ v, c: comissaoDaVenda(v, state.parcelas, state.config) }));
    }
    return state.empreendimentos;
  }, [tipo, empId, inicio, fim, state]);

  const doExport = (fmt: string) => {
    toast.success(`Exportação em ${fmt} preparada`, {
      description: "Demonstração visual — nenhum arquivo é gerado.",
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Análises"
        title="Relatórios"
        description="Extraia relatórios gerenciais de vendas, recebimentos, comissões e carteira."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => doExport("PDF")}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={() => doExport("Excel")}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
          </>
        }
      />

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
          <div>
            <Label>Tipo de relatório</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as ReportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recebimentos">Recebimentos</SelectItem>
                <SelectItem value="vendas">Vendas</SelectItem>
                <SelectItem value="comissoes">Comissões de corretores</SelectItem>
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
          <div>
            <Label>Data inicial</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label>Data final</Label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="h-4 w-4 text-primary" />
            {tipo === "recebimentos" && "Recebimentos"}
            {tipo === "vendas" && "Vendas"}
            {tipo === "comissoes" && "Comissões de corretores"}
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
                  <TableHead>Contrato</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Repassado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as { v: (typeof state.vendas)[number]; c: ReturnType<typeof comissaoDaVenda> }[]).map(({ v, c }) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.corretorNome}</TableCell>
                    <TableCell>{v.compradorNome}</TableCell>
                    <TableCell className="text-right">{brl0(c.total)}</TableCell>
                    <TableCell className="text-right text-success">{brl0(c.pago)}</TableCell>
                    <TableCell className="text-right">{brl0(c.saldo)}</TableCell>
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
