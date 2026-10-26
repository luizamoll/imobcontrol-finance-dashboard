package br.com.imobcontrol.dividendos;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DividendoTerceiroRepository extends JpaRepository<DividendoTerceiro, Long> {
    List<DividendoTerceiro> findAllByEmpresaIdOrderByAtualizadoEmDesc(Long empresaId);
    Optional<DividendoTerceiro> findByIdAndEmpresaId(Long id, Long empresaId);
}
