package br.com.imobcontrol.cliente;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    Page<Cliente> findByEmpresaId(Long empresaId, Pageable pageable);
    Optional<Cliente> findByIdAndEmpresaId(Long id, Long empresaId);
    boolean existsByEmpresaIdAndCpf(Long empresaId, String cpf);
}
