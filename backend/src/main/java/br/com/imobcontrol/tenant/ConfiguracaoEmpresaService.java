package br.com.imobcontrol.tenant;

import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.math.BigDecimal;
import java.util.Objects;

@Service
public class ConfiguracaoEmpresaService {

    private final ConfiguracaoEmpresaRepository configuracoes;
    private final TenantContextService tenants;
    private final PermissaoAcessoService acesso;
    private final AuditoriaOperacionalRepository auditoria;
    private final JsonMapper json;

    public ConfiguracaoEmpresaService(
            ConfiguracaoEmpresaRepository configuracoes,
            TenantContextService tenants,
            PermissaoAcessoService acesso,
            AuditoriaOperacionalRepository auditoria,
            JsonMapper json
    ) {
        this.configuracoes = configuracoes;
        this.tenants = tenants;
        this.acesso = acesso;
        this.auditoria = auditoria;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public ConfiguracaoEmpresaResponse obter(
            Authentication autenticacao,
            Long empresaSolicitada
    ) {
        acesso.exigirQualquer(
                autenticacao,
                PermissaoUsuario.CONFIGURACOES_GERENCIAR,
                PermissaoUsuario.EMPREENDIMENTOS_GERENCIAR
        );
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);

        return configuracoes.findById(ctx.empresaId())
                .map(this::toResponse)
                .orElseGet(() -> new ConfiguracaoEmpresaResponse(
                        ctx.empresaId(),
                        json.createObjectNode(),
                        null,
                        null
                ));
    }

    @Transactional
    public ConfiguracaoEmpresaResponse salvar(
            Authentication autenticacao,
            Long empresaSolicitada,
            ConfiguracaoEmpresaRequest body
    ) {
        acesso.exigir(autenticacao, PermissaoUsuario.CONFIGURACOES_GERENCIAR);
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        validar(body.config());

        ConfiguracaoEmpresa config = configuracoes.findById(ctx.empresaId()).orElse(null);
        if (config == null) {
            if (body.versao() != null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "A configuração ainda não existe. Atualize a tela antes de salvar."
                );
            }
            config = new ConfiguracaoEmpresa();
            config.setEmpresaId(ctx.empresaId());
        } else if (body.versao() == null || !Objects.equals(body.versao(), config.getVersao())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "As configurações foram alteradas por outra sessão. Atualize a tela."
            );
        }

        config.setConfigJson(json.writeValueAsString(body.config()));
        config.setAtualizadoPorUsuarioId(ctx.usuarioId());

        try {
            ConfiguracaoEmpresa salva = configuracoes.saveAndFlush(config);
            auditoria.save(new AuditoriaOperacional(
                    ctx.empresaId(),
                    ctx.usuarioId(),
                    "CONFIGURACAO_EMPRESA",
                    ctx.empresaId(),
                    "ATUALIZACAO"
            ));
            return toResponse(salva);
        } catch (OptimisticLockingFailureException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "As configurações foram alteradas por outra sessão. Atualize a tela.",
                    ex
            );
        }
    }

    private ConfiguracaoEmpresaResponse toResponse(ConfiguracaoEmpresa config) {
        return new ConfiguracaoEmpresaResponse(
                config.getEmpresaId(),
                ler(config.getConfigJson()),
                config.getVersao(),
                config.getAtualizadoEm()
        );
    }

    private JsonNode ler(String valor) {
        if (valor == null || valor.isBlank()) return json.createObjectNode();
        return json.readTree(valor);
    }

    private void validar(JsonNode config) {
        if (config == null || !config.isObject()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Configuração inválida");
        }

        JsonNode padroes = config.path("padroesEmpreendimento");
        if (!padroes.isObject()) return;

        BigDecimal socio = decimalNaoNegativo(padroes, "socioPct");
        BigDecimal empresa = decimalNaoNegativo(padroes, "empresaPct");
        BigDecimal corretor = decimalNaoNegativo(padroes, "corretorPct");
        BigDecimal aliquota = decimalNaoNegativo(padroes, "aliquotaTributaria");
        BigDecimal repasse = decimalNaoNegativo(padroes, "repasseComissaoPct");

        percentualAteCem(socio, "Participação do sócio");
        percentualAteCem(empresa, "Participação da empresa");
        percentualAteCem(corretor, "Comissão do corretor");
        percentualAteCem(aliquota, "Alíquota tributária");
        percentualAteCem(repasse, "Repasse da comissão");

        if (socio != null && empresa != null
                && socio.add(empresa).compareTo(new BigDecimal("100")) != 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Participação do sócio e da empresa deve totalizar 100%"
            );
        }

        JsonNode inadimplencia = padroes.path("inadimplencia");
        if (inadimplencia.isObject()) {
            decimalNaoNegativo(inadimplencia, "correcaoPctMes");
            decimalNaoNegativo(inadimplencia, "jurosPctMes");
            decimalNaoNegativo(inadimplencia, "jurosPctDia");
            decimalNaoNegativo(inadimplencia, "moraPct");

            JsonNode tolerancia = inadimplencia.get("diasTolerancia");
            if (tolerancia != null && !tolerancia.isNull() && tolerancia.asInt() < 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Dias de tolerância não pode ser negativo"
                );
            }
        }
    }

    private BigDecimal decimalNaoNegativo(JsonNode node, String campo) {
        JsonNode valor = node.get(campo);
        if (valor == null || valor.isNull()) return null;

        BigDecimal numero;
        try {
            numero = valor.decimalValue();
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, campo + " inválido");
        }

        if (numero.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, campo + " não pode ser negativo");
        }
        return numero;
    }

    private void percentualAteCem(BigDecimal valor, String nome) {
        if (valor != null && valor.compareTo(new BigDecimal("100")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, nome + " não pode ultrapassar 100%");
        }
    }
}
