import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { VendaStatusBadge } from "@/components/status-badges";
import {
  useStore,
  vendaTotais,
  type PagamentoItem,
  type PagamentoTipo,
} from "@/lib/store";
import { brl0, formatDate, todayISO, uid } from "@/lib/format";

export const Route = createFileRoute("/vendas")({
  component: VendasPage,
  head: () => ({ meta: [{ title: "Vendas · ImobControl" }] }),
});

function VendasPage() {
  const { state, addVenda } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Comercial"
        title="Vendas"
        description="Registre novos contratos, composição de pagamento e comissionamento."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova venda
              </Button>
            </DialogTrigger>
            <NewVendaDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <Card className="border-border/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.vendas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma venda registrada.
                  </TableCell>
                </TableRow>
              )}
              {state.vendas.map((v) => {
                const emp = state.empreendimentos.find((e) => e.id === v.empreendimentoId);
                const mat = state.matriculas.find((m) => m.id === v.matriculaId);
                const t = vendaTotais(v, state.parcelas);
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{mat?.numero || "—"}</div>
                          <div className="text-xs text-muted-foreground">{mat?.unidade}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{v.compradorNome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp ? (
                        <Link to="/empreendimentos/$id" params={{ id: emp.id }} className="hover:text-primary">
                          {emp.nome}
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{v.corretorNome}</TableCell>
                    <TableCell className="text-sm">{formatDate(v.dataContrato)}</TableCell>
                    <TableCell className="text-right font-medium">{brl0(v.valorTotal)}</TableCell>
                    <TableCell className="text-right text-success">{brl0(t.recebido)}</TableCell>
                    <TableCell className="text-right">{brl0(t.saldo)}</TableCell>
                    <TableCell><VendaStatusBadge status={v.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function emptyItem(tipo: PagamentoTipo = "sinal"): PagamentoItem {
  return {
    id: uid(),
    tipo,
    descricao: tipo === "sinal" ? "Sinal na assinatura" : "Parcelas mensais",
    valor: 0,
    parcelas: tipo === "parcelas" ? 12 : 1,
    primeiroVencimento: todayISO(),
    status: "pendente",
  };
}

function NewVendaDialog({ onClose }: { onClose: () => void }) {
  const { state, addVenda } = useStore();
  const [empId, setEmpId] = useState<string>("");
  const [matId, setMatId] = useState<string>("");
  const [comprador, setComprador] = useState("");
  const [dataContrato, setDataContrato] = useState(todayISO());
  const [corretor, setCorretor] = useState(state.config.recebedores.find((r) => r.tipo === "corretor")?.nome || "");
  const [corretorPct, setCorretorPct] = useState(String(state.config.corretorPctPadrao));
  const [obs, setObs] = useState("");
  const [items, setItems] = useState<PagamentoItem[]>([emptyItem("sinal"), emptyItem("parcelas")]);

  const matriculas = useMemo(
    () => state.matriculas.filter((m) => m.empreendimentoId === empId && m.status !== "vendido"),
    [state.matriculas, empId],
  );

  const totalComposicao = items.reduce((a, i) => a + i.valor * (i.tipo === "parcelas" || i.tipo === "sinal_parcelado" ? i.parcelas : 1), 0);

  const submit = () => {
    if (!empId || !matId || !comprador) {
      toast.error("Preencha empreendimento, matrícula e comprador");
      return;
    }
    addVenda({
      empreendimentoId: empId,
      matriculaId: matId,
      compradorNome: comprador,
      valorTotal: totalComposicao,
      dataContrato,
      corretorNome: corretor,
      corretorPct: Number(corretorPct) || 0,
      observacoes: obs,
      composicao: items,
    });
    toast.success("Venda registrada");
    onClose();
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nova venda</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Empreendimento</Label>
          <Select value={empId} onValueChange={(v) => { setEmpId(v); setMatId(""); }}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {state.empreendimentos.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Matrícula / Unidade</Label>
          <Select value={matId} onValueChange={setMatId} disabled={!empId}>
            <SelectTrigger><SelectValue placeholder={empId ? "Selecione" : "Escolha o empreendimento"} /></SelectTrigger>
            <SelectContent>
              {matriculas.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.numero} · {m.unidade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Comprador</Label>
          <Input value={comprador} onChange={(e) => setComprador(e.target.value)} />
        </div>
        <div>
          <Label>Data do contrato</Label>
          <Input type="date" value={dataContrato} onChange={(e) => setDataContrato(e.target.value)} />
        </div>
        <div>
          <Label>Corretor responsável</Label>
          <Select value={corretor} onValueChange={setCorretor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {state.config.recebedores.filter((r) => r.tipo === "corretor").map((r) => (
                <SelectItem key={r.nome} value={r.nome}>{r.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>% Comissão</Label>
          <Input type="number" value={corretorPct} onChange={(e) => setCorretorPct(e.target.value)} />
        </div>
      </div>

      <Separator className="my-2" />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Composição do pagamento</h3>
            <p className="text-xs text-muted-foreground">
              Combine à vista, sinal, parcelas ou bem material como parte do pagamento.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setItems((x) => [...x, emptyItem("sinal")])}>
              + Sinal
            </Button>
            <Button size="sm" variant="outline" onClick={() => setItems((x) => [...x, emptyItem("parcelas")])}>
              + Parcelas
            </Button>
            <Button size="sm" variant="outline" onClick={() => setItems((x) => [...x, emptyItem("bem")])}>
              + Bem
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Label className="text-xs">Tipo</Label>
                <Select value={it.tipo} onValueChange={(v) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, tipo: v as PagamentoTipo } : x))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avista">À vista</SelectItem>
                    <SelectItem value="sinal">Sinal</SelectItem>
                    <SelectItem value="sinal_parcelado">Sinal parcelado</SelectItem>
                    <SelectItem value="parcelas">Parcelas mensais</SelectItem>
                    <SelectItem value="sem_sinal">Sem sinal</SelectItem>
                    <SelectItem value="bem">Bem material</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Descrição</Label>
                <Input value={it.descricao} onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, descricao: e.target.value } : x))} />
              </div>
              <div>
                <Label className="text-xs">Valor unitário</Label>
                <Input type="number" value={it.valor || ""} onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, valor: Number(e.target.value) || 0 } : x))} />
              </div>
              <div>
                <Label className="text-xs">Nº parcelas</Label>
                <Input type="number" value={it.parcelas} onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, parcelas: Number(e.target.value) || 1 } : x))} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Primeiro vencimento</Label>
                <Input type="date" value={it.primeiroVencimento} onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, primeiroVencimento: e.target.value } : x))} />
              </div>
              {it.tipo === "bem" && (
                <div className="sm:col-span-4">
                  <Label className="text-xs">Bem material (descrição)</Label>
                  <Input placeholder="Ex.: Veículo modelo XYZ, placa ABC-1234" onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, observacoes: e.target.value } : x))} />
                </div>
              )}
              <div className="flex items-end justify-end">
                <Button size="icon" variant="ghost" onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Valor total do contrato</span>
          <span className="text-base font-semibold">{brl0(totalComposicao)}</span>
        </div>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>Registrar venda</Button>
      </DialogFooter>
    </DialogContent>
  );
}
