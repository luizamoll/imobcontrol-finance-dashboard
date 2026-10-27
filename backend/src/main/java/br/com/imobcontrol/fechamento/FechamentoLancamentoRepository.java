package br.com.imobcontrol.fechamento;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FechamentoLancamentoRepository extends JpaRepository<FechamentoLancamento, Long> {
    List<FechamentoLancamento> findAllByEmpresaIdAndDataLancamentoBetweenOrderByDataLancamentoAscIdAsc(
        Long empresaId, LocalDate inicio, LocalDate fim
    );
    Optional<FechamentoLancamento> findByIdAndEmpresaId(Long id, Long empresaId);
}