import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Save,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { RegrasOperacaoForm } from "@/components/regras-operacao-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONFIG_EMPRESA_PADRAO,
  carregarConfiguracaoEmpresa,
  salvarConfiguracaoEmpresa,
  type ConfiguracaoEmpresa,
} from "@/lib/empresa-config-api";
import { formatCNPJ } from "@/lib/format";
import {
  carregarPerfilEmpresa,
  salvarPerfilEmpresa,
  type EmpresaPerfil,
} from "@/lib/empresa-perfil-api";
import { useAuth } from "@/lib/auth";
import { temPermissao } from "@/lib/permissoes";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
  head: () => ({ meta: [{ title: "Configurações · ImobControl" }] }),
});

function clonePadrao(): ConfiguracaoEmpresa {
  return {
    dadosEmpresa: { ...CONFIG_EMPRESA_PADRAO.dadosEmpresa },
    padroesEmpreendimento: {
      ...CONFIG_EMPRESA_PADRAO.padroesEmpreendimento,
      inadimplencia: {
        ...CONFIG_EMPRESA_PADRAO.padroesEmpreendimento.inadimplencia,
      },
    },
    onboardingConcluido: false,
  };
}

function ConfigPage() {
  const { usuario } = useAuth();
  const { empresaAtual, empresaAtualId } = useTenant();
  const [config, setConfig] = useState<ConfiguracaoEmpresa>(clonePadrao);
  const [perfilEmpresa, setPerfilEmpresa] = useState<EmpresaPerfil | null>(null);
  const [versao, setVersao] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const podeGerenciar = temPermissao(usuario, "CONFIGURACOES_GERENCIAR");

  useEffect(() => {
    if (!empresaAtualId || !podeGerenciar) {
      setCarregando(false);
      return;
    }

    let cancelado = false;
    setCarregando(true);

    void Promise.all([
      carregarConfiguracaoEmpresa(empresaAtualId),
      carregarPerfilEmpresa(empresaAtualId),
    ])
      .then(([response, perfil]) => {
        if (cancelado) return;
        setConfig(response.config);
        setVersao(response.versao);
        setPerfilEmpresa(perfil);
      })
      .catch((error) => {
        if (!cancelado) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as configurações da empresa",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [empresaAtualId, podeGerenciar]);

  if (!podeGerenciar) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Sistema"
          title="Acesso restrito"
          description="Seu usuário não possui permissão para alterar as configurações da empresa."
        />
      </PageShell>
    );
  }

  if (!empresaAtualId) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Sistema"
          title="Configurações"
          description="Selecione uma empresa cliente antes de configurar o ambiente."
        />
      </PageShell>
    );
  }

  const salvar = async () => {
    const regras = config.padroesEmpreendimento;
    if (Math.abs(regras.socioPct + regras.empresaPct - 100) > 0.001) {
      toast.error("A participação do sócio e da empresa deve totalizar 100%.");
      return;
    }

    setSalvando(true);
    try {
      if (!perfilEmpresa?.nome.trim()) {
        toast.error("Informe o nome fantasia da empresa.");
        return;
      }

      const [salva, perfilSalvo] = await Promise.all([
        salvarConfiguracaoEmpresa(
          empresaAtualId,
          { ...config, onboardingConcluido: true },
          versao,
        ),
        salvarPerfilEmpresa(empresaAtualId, {
          nome: perfilEmpresa.nome.trim(),
          razaoSocial: perfilEmpresa.razaoSocial?.trim() || null,
          cnpj: perfilEmpresa.cnpj?.trim() || null,
          email: perfilEmpresa.email?.trim() || null,
          telefone: perfilEmpresa.telefone?.trim() || null,
        }),
      ]);
      setConfig(salva.config);
      setVersao(salva.versao);
      setPerfilEmpresa(perfilSalvo);
      toast.success("Dados da empresa e configurações salvos");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar as configurações",
      );
      if ((error as Error & { status?: number })?.status === 409) {
        try {
          const atual = await carregarConfiguracaoEmpresa(empresaAtualId);
          setConfig(atual.config);
          setVersao(atual.versao);
        } catch {
          // A mensagem de conflito já orienta a atualizar.
        }
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Configuração inicial"
        title={empresaAtual?.nome ?? "Configurações da empresa"}
        description="Defina os dados básicos do ambiente e os valores que serão usados apenas como ponto de partida ao criar novos empreendimentos."
        actions={
          <Button
            size="sm"
            onClick={() => void salvar()}
            disabled={carregando || salvando}
          >
            <Save className="mr-2 h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar configurações"}
          </Button>
        }
      />

      {config.onboardingConcluido && (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div>
              <div className="text-sm font-semibold">Configuração inicial concluída</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Você pode alterar estes dados depois. Mudanças nos padrões não reescrevem empreendimentos,
                vendas ou recebimentos já existentes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Cadastro da empresa</CardTitle>
          <p className="text-sm text-muted-foreground">
            Estes são os dados da empresa cliente. Eles ficam separados dos dados pessoais do ADMIN e podem ser editados depois.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Nome fantasia</Label>
            <Input
              value={perfilEmpresa?.nome ?? ""}
              onChange={(e) =>
                setPerfilEmpresa((atual) =>
                  atual ? { ...atual, nome: e.target.value } : atual,
                )
              }
              placeholder="Ex.: Líder"
            />
          </div>
          <div>
            <Label>Razão social</Label>
            <Input
              value={perfilEmpresa?.razaoSocial ?? ""}
              onChange={(e) =>
                setPerfilEmpresa((atual) =>
                  atual ? { ...atual, razaoSocial: e.target.value } : atual,
                )
              }
              placeholder="Razão social da empresa"
            />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input
              value={perfilEmpresa?.cnpj ? formatCNPJ(perfilEmpresa.cnpj) : ""}
              onChange={(e) =>
                setPerfilEmpresa((atual) =>
                  atual
                    ? { ...atual, cnpj: formatCNPJ(e.target.value) }
                    : atual,
                )
              }
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <Label>Telefone da empresa</Label>
            <Input
              value={perfilEmpresa?.telefone ?? ""}
              onChange={(e) =>
                setPerfilEmpresa((atual) =>
                  atual ? { ...atual, telefone: e.target.value } : atual,
                )
              }
              placeholder="Contato comercial"
            />
          </div>
          <div className="md:col-span-2">
            <Label>E-mail da empresa</Label>
            <Input
              type="email"
              value={perfilEmpresa?.email ?? ""}
              onChange={(e) =>
                setPerfilEmpresa((atual) =>
                  atual ? { ...atual, email: e.target.value } : atual,
                )
              }
              placeholder="contato@empresa.com.br"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Padrões para novos empreendimentos</p>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
                Estes valores são somente um modelo inicial. Ao criar um empreendimento, o formulário
                começa preenchido com eles, mas o usuário pode alterar tudo naquele projeto. Alterar o
                padrão depois não modifica empreendimentos ou contratos já cadastrados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Modelo financeiro inicial</CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Carregando configurações...
            </div>
          ) : (
            <RegrasOperacaoForm
              value={config.padroesEmpreendimento}
              scopeLabel={`Padrão de novos empreendimentos de ${empresaAtual?.nome ?? "esta empresa"}`}
              onChange={(padroesEmpreendimento) =>
                setConfig((atual) => ({ ...atual, padroesEmpreendimento }))
              }
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Próximo passo: empreendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Depois da configuração inicial, cadastre o primeiro empreendimento. Ele recebe estes
              padrões como sugestão e passa a ter suas próprias regras.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/empreendimentos">
                Abrir empreendimentos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Equipe e acessos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              O ADMIN pode criar funcionários, definir permissões e bloquear acessos sem sair do
              ambiente da própria empresa.
            </p>
            {temPermissao(usuario, "EQUIPE_GERENCIAR") && (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/equipe">
                  Abrir equipe <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Hierarquia preservada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Empresa, empreendimento, unidade, venda e recebimento continuam sendo níveis separados.
              Uma configuração só afeta automaticamente o nível que explicitamente a utiliza.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
