import { Calculator, Building2, User, Landmark, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { brl0, formatDate, pct } from "@/lib/format";
import {
  memoriaDoMovimento,
  type Empreendimento,
  type Movimento,
} from "@/lib/store";

interface Props {
  movimentos: Movimento[];
  empreendimentos: Empreendimento[];
  /** Totais previstos (contratado) de empresa e sócio */
  previsto?: { empresa: number; socio: number };
  titulo?: string;
  descricao?: string;
}

export function DistribuicaoFinanceira({
  movimentos,
  empreendimentos,
  previsto,
  titulo = "Distribuição Financeira",
  descricao = "Memória de cada recebimento: bruto, imposto, corretor e repasses de Empresa e Sócio.",
}: Props) {
  const [aberto, setAberto] = useState<Movimento | null>(null);

  const empById = useMemo(
    () => new Map(empreendimentos.map((e) => [e.id, e])),
    [empreendimentos],
  );

  const ordenados = useMemo(
    () => [...movimentos].sort((a, b) => b.data.localeCompare(a.data)),
    [movimentos],
  );

  const totalEmpresa = movimentos.reduce((a, m) => a + m.empresaValor, 0);
  const totalSocio = movimentos.reduce((a, m) => a + m.socioValor, 0);
  const totalImposto = movimentos.reduce((a, m) => a + m.impostoReservado, 0);
  const totalComissao = movimentos.reduce((a, m) => a + m.comissaoPaga, 0);
  const totalBruto = movimentos.reduce((a, m) => a + m.valorRecebido, 0);

  const memoria = aberto ? memoriaDoMovimento(aberto, empById.get(aberto.empreendimentoId)) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ResumoCard
          icon={Building2}
          titulo="Empresa"
          recebido={totalEmpresa}
          previsto={previsto?.empresa}
          historico={ordenados
            .filter((m) => m.empresaValor > 0)
            .slice(0, 5)
            .map((m) => ({ id: m.id, data: m.data, label: m.compradorNome, valor: m.empresaValor }))}
        />
        <ResumoCard
          icon={User}
          titulo="Sócio"
          recebido={totalSocio}
          previsto={previsto?.socio}
          historico={ordenados
            .filter((m) => m.socioValor > 0)
            .slice(0, 5)
            .map((m) => ({ id: m.id, data: m.data, label: m.compradorNome, valor: m.socioValor }))}
        />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{titulo}</CardTitle>
          <p className="text-xs text-muted-foreground">{descricao}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5" /> Imposto reservado:{" "}
              <strong className="text-foreground">{brl0(totalImposto)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Corretor:{" "}
              <strong className="text-foreground">{brl0(totalComissao)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              Bruto recebido: <strong className="text-foreground">{brl0(totalBruto)}</strong>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente / origem</TableHead>
                  <TableHead className="text-right">Valor bruto</TableHead>
                  <TableHead className="text-right">Imposto</TableHead>
                  <TableHead className="text-right">Corretor</TableHead>
                  <TableHead className="text-right">Restante</TableHead>
                  <TableHead className="text-right">Empresa</TableHead>
                  <TableHead className="text-right">Sócio</TableHead>
                  <TableHead className="text-right">Memória</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum recebimento distribuído ainda.
                    </TableCell>
                  </TableRow>
                )}
                {ordenados.map((m) => {
                  const mem = memoriaDoMovimento(m, empById.get(m.empreendimentoId));
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{formatDate(m.data)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{m.compradorNome}</div>
                        <div className="text-xs text-muted-foreground">{m.origemDescricao}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{brl0(mem.valorRecebido)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {brl0(mem.imposto)}
                        <div className="text-[11px]">{pct(mem.aliquota)}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{brl0(mem.comissao)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl0(mem.restante)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl0(mem.empresaValor)}
                        <div className="text-[11px] text-muted-foreground">{pct(mem.empresaPct)}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl0(mem.socioValor)}
                        <div className="text-[11px] text-muted-foreground">{pct(mem.socioPct)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setAberto(m)}>
                          <Calculator className="mr-1 h-3.5 w-3.5" /> Ver memória de cálculo
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Memória de cálculo</DialogTitle>
            <DialogDescription>
              {aberto
                ? `${aberto.compradorNome} · ${aberto.origemDescricao} · ${formatDate(aberto.data)} · registrado por ${aberto.usuario}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {memoria && (
            <ol className="space-y-2">
              <Passo n={1} label="Valor recebido" valor={memoria.valorRecebido} destaque />
              <Passo
                n={2}
                label={`Imposto reservado (${pct(memoria.aliquota)} da SPE)`}
                valor={-memoria.imposto}
              />
              <Passo n={3} label="Comissão paga ao corretor" valor={-memoria.comissao} />
              <Passo n={4} label="Valor restante" valor={memoria.restante} destaque />
              <Passo n={5} label={`Empresa (${pct(memoria.empresaPct)})`} valor={memoria.empresaValor} />
              <Passo n={6} label={`Sócio (${pct(memoria.socioPct)})`} valor={memoria.socioValor} />
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Passo({
  n,
  label,
  valor,
  destaque,
}: {
  n: number;
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-md border border-border/60 p-3 text-sm ${
        destaque ? "bg-muted/40" : ""
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {n}
        </span>
        {label}
      </span>
      <span className={`font-semibold tabular-nums ${valor < 0 ? "text-destructive" : ""}`}>
        {valor < 0 ? `- ${brl0(Math.abs(valor))}` : brl0(valor)}
      </span>
    </li>
  );
}

function ResumoCard({
  icon: Icon,
  titulo,
  recebido,
  previsto,
  historico,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  recebido: number;
  previsto?: number;
  historico: { id: string; data: string; label: string; valor: number }[];
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total recebido</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-success">{brl0(recebido)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total previsto</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {previsto === undefined ? "—" : brl0(previsto)}
            </p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Histórico de repasses
          </p>
          <div className="space-y-1.5">
            {historico.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem repasses registrados.</p>
            )}
            {historico.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between border-b border-border/50 pb-1.5 text-sm last:border-0 last:pb-0"
              >
                <span className="truncate text-muted-foreground">
                  {formatDate(h.data)} · {h.label}
                </span>
                <span className="font-medium tabular-nums">{brl0(h.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
