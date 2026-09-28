package br.com.imobcontrol.financeiro;

import org.springframework.data.jpa.repository.JpaRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface MovimentoRepository extends JpaRepository<Movimento, Long> {
    List<Movimento> findAllByEmpresaIdAndEstornadoFalseOrderByDataMovimentoDescIdDesc(Long empresaId);
    List<Movimento> findAllByEmpresaIdAndVendaIdAndEstornadoFalseOrderByDataMovimentoAscIdAsc(Long empresaId, Long vendaId);
    List<Movimento> findAllByEmpresaIdAndParcelaIdAndEstornadoFalseOrderByIdDesc(Long empresaId, Long parcelaId);
    boolean existsByEmpresaIdAndVendaIdAndEstornadoFalse(Long empresaId, Long vendaId);
    Optional<Movimento> findFirstByEmpresaIdAndParcelaIdAndEstornadoFalseOrderByIdDesc(Long empresaId, Long parcelaId);
}
