package br.com.imobcontrol.financeiro;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ReajusteVendaRepository extends JpaRepository<ReajusteVenda, Long> {
    boolean existsByEmpresaIdAndVendaIdAndDataReferencia(Long empresaId, Long vendaId, LocalDate dataReferencia);
    List<ReajusteVenda> findAllByEmpresaIdAndVendaIdOrderByDataReferenciaDescIdDesc(Long empresaId, Long vendaId);
}
