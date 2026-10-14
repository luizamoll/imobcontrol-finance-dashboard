package br.com.imobcontrol.financeiro;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AcordoRepository extends JpaRepository<Acordo, Long> {
    List<Acordo> findAllByEmpresaIdAndVendaIdOrderByDataAcordoDescIdDesc(Long empresaId, Long vendaId);
}
