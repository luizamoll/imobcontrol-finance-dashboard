package br.com.imobcontrol.fechamento;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FechamentoArquivoRepository extends JpaRepository<FechamentoArquivo, Long> {
    List<FechamentoArquivo> findAllByEmpresaIdOrderByMesDescIdDesc(Long empresaId);
    Optional<FechamentoArquivo> findByIdAndEmpresaId(Long id, Long empresaId);
    boolean existsByEmpresaIdAndEmpreendimentoIdAndMes(Long empresaId, Long empreendimentoId, String mes);
}