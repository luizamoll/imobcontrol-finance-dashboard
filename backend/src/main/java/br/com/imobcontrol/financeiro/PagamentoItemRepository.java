package br.com.imobcontrol.financeiro;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PagamentoItemRepository extends JpaRepository<PagamentoItem, Long> {
    List<PagamentoItem> findAllByEmpresaIdAndVendaIdOrderByIdAsc(Long empresaId, Long vendaId);
    void deleteByEmpresaIdAndVendaId(Long empresaId, Long vendaId);
}
