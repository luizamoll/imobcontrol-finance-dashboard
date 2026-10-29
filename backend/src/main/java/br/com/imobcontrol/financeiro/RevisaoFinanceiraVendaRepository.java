package br.com.imobcontrol.financeiro;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RevisaoFinanceiraVendaRepository extends JpaRepository<RevisaoFinanceiraVenda, Long> {
    List<RevisaoFinanceiraVenda> findAllByEmpresaIdAndVendaIdOrderByIdDesc(Long empresaId, Long vendaId);
}