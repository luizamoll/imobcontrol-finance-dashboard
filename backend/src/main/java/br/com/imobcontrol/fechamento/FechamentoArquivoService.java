package br.com.imobcontrol.fechamento;

import br.com.imobcontrol.tenant.TenantContextService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.time.YearMonth;
import java.util.List;

@Service
public class FechamentoArquivoService {
    private final FechamentoArquivoRepository arquivos;
    private final FechamentoMensalService fechamento;
    private final TenantContextService tenants;
    private final JsonMapper json;

    public FechamentoArquivoService(
        FechamentoArquivoRepository arquivos,
        FechamentoMensalService fechamento,
        TenantContextService tenants,
        JsonMapper json
    ) {
        this.arquivos = arquivos;
        this.fechamento = fechamento;
        this.tenants = tenants;
        this.json = json;
    }

    @Transactional
    public FechamentoArquivoResponse arquivar(
        Authentication auth, Long empresaId, FechamentoArquivoRequest request
    ) {
        var ctx = tenants.resolver(auth, empresaId);
        YearMonth mes = FechamentoMensalService.periodo(request.mes());
        if (!mes.isBefore(YearMonth.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Somente meses encerrados podem ser arquivados"
            );
        }
        if (arquivos.existsByEmpresaIdAndEmpreendimentoIdAndMes(
            ctx.empresaId(), request.empreendimentoId(), request.mes()
        )) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Este mês já possui fechamento arquivado"
            );
        }

        // Grava o relatório completo: totais, participantes, unidades e lançamentos
        // ficam congelados como estavam na aprovação, sem recalcular a cada leitura.
        var relatorio = fechamento.consultar(
            auth, empresaId, request.mes(), request.empreendimentoId()
        );

        FechamentoArquivo novo = new FechamentoArquivo();
        novo.setEmpresaId(ctx.empresaId());
        novo.setEmpreendimentoId(request.empreendimentoId());
        novo.setMes(request.mes());
        novo.setCriadoPorUsuarioId(ctx.usuarioId());
        novo.setRelatorioJson(json.writeValueAsString(relatorio));
        try {
            var salvo = arquivos.saveAndFlush(novo);
            return resposta(salvo);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Este mês já foi arquivado por outro usuário", exception);
        }
    }

    @Transactional(readOnly = true)
    public List<FechamentoArquivoResponse> listar(Authentication auth, Long empresaId) {
        var ctx = tenants.resolver(auth, empresaId);
        return arquivos.findAllByEmpresaIdOrderByMesDescIdDesc(ctx.empresaId()).stream()
            .map(this::resposta).toList();
    }

    @Transactional(readOnly = true)
    public FechamentoArquivoResponse buscar(Authentication auth, Long empresaId, Long id) {
        var ctx = tenants.resolver(auth, empresaId);
        var salvo = arquivos.findByIdAndEmpresaId(id, ctx.empresaId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return resposta(salvo);
    }

    private FechamentoArquivoResponse resposta(FechamentoArquivo arquivo) {
        return new FechamentoArquivoResponse(
            arquivo.getId(), arquivo.getMes(), arquivo.getEmpreendimentoId(),
            arquivo.getCriadoEm(), arquivo.getCriadoPorUsuarioId(),
            json.readValue(arquivo.getRelatorioJson(), FechamentoMensalResponse.class)
        );
    }
}
