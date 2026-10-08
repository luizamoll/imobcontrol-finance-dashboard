package br.com.imobcontrol.tenant;

import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import br.com.imobcontrol.cliente.ClienteRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/super-admin/empresas")
public class SuperAdminEmpresaController {

    private final EmpresaRepository empresas;
    private final UsuarioRepository usuarios;
    private final AuditoriaOperacionalRepository auditoria;
    private final ClienteRepository clientes;

    public SuperAdminEmpresaController(
            EmpresaRepository empresas,
            UsuarioRepository usuarios,
            AuditoriaOperacionalRepository auditoria,
            ClienteRepository clientes
    ) {
        this.empresas = empresas;
        this.usuarios = usuarios;
        this.auditoria = auditoria;
        this.clientes = clientes;
    }

    @GetMapping
    public List<EmpresaResumo> listar(
            @RequestParam(defaultValue = "false") boolean incluirInativas
    ) {
        return (incluirInativas
                ? empresas.findAllByOrderByNomeAsc()
                : empresas.findAllByAtivaTrueOrderByNomeAsc())
                .stream()
                .map(this::resumo)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmpresaResumo criar(
            Authentication autenticacao,
            @Valid @RequestBody CriarEmpresa body
    ) {
        Usuario ator = usuarios.findByEmailIgnoreCase(autenticacao.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        Empresa empresa = new Empresa();
        empresa.setNome(body.nome().trim());
        empresa.setSlug(slugUnico(body.nome()));
        empresa.setRazaoSocial(textoOpcional(body.razaoSocial()));
        empresa.setCnpj(cnpjDisponivel(null, body.cnpj()));
        empresa.setEmail(emailOpcional(body.email()));
        empresa.setTelefone(textoOpcional(body.telefone()));
        empresa.setAtiva(true);

        Empresa salva = empresas.saveAndFlush(empresa);
        auditoria.save(new AuditoriaOperacional(
                salva.getId(),
                ator.getId(),
                "EMPRESA",
                salva.getId(),
                "EMPRESA_CRIADA"
        ));
        return resumo(salva);
    }

    @PutMapping("/{id}")
    public EmpresaResumo atualizar(
            Authentication autenticacao,
            @PathVariable Long id,
            @Valid @RequestBody AtualizarEmpresa body
    ) {
        Usuario ator = usuarios.findByEmailIgnoreCase(autenticacao.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Empresa empresa = empresas.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));

        empresa.setNome(body.nome().trim());
        if (body.razaoSocial() != null) {
            empresa.setRazaoSocial(textoOpcional(body.razaoSocial()));
        }
        if (body.cnpj() != null) {
            empresa.setCnpj(cnpjDisponivel(empresa.getId(), body.cnpj()));
        }
        if (body.email() != null) {
            empresa.setEmail(emailOpcional(body.email()));
        }
        if (body.telefone() != null) {
            empresa.setTelefone(textoOpcional(body.telefone()));
        }
        if (body.ativa() != null) {
            empresa.setAtiva(body.ativa());
        }
        Empresa salva = empresas.saveAndFlush(empresa);
        auditoria.save(new AuditoriaOperacional(
                salva.getId(),
                ator.getId(),
                "EMPRESA",
                salva.getId(),
                "EMPRESA_ATUALIZADA"
        ));
        return resumo(salva);
    }

    private String textoOpcional(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return valor.trim();
    }

    private String emailOpcional(String valor) {
        String email = textoOpcional(valor);
        return email == null ? null : email.toLowerCase(Locale.ROOT);
    }

    private String cnpjDisponivel(Long empresaIdAtual, String valor) {
        String cnpj = textoOpcional(valor);
        if (cnpj == null) return null;

        cnpj = cnpj.replaceAll("[^0-9]", "");
        if (cnpj.length() != 14) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CNPJ deve conter 14 dígitos");
        }

        empresas.findByCnpj(cnpj).ifPresent(existente -> {
            if (empresaIdAtual == null || !existente.getId().equals(empresaIdAtual)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "CNPJ já cadastrado");
            }
        });
        return cnpj;
    }

    private String slugUnico(String nome) {
        String base = Normalizer.normalize(nome, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "empresa";

        String candidato = base;
        int sufixo = 2;
        while (empresas.findBySlug(candidato).isPresent()) {
            candidato = base + "-" + sufixo++;
        }
        return candidato;
    }

    public record CriarEmpresa(
            @NotBlank @Size(max = 160) String nome,
            @Size(max = 200) String razaoSocial,
            @Size(max = 18) String cnpj,
            @Email @Size(max = 200) String email,
            @Size(max = 30) String telefone
    ) {
    }

    public record AtualizarEmpresa(
            @NotBlank @Size(max = 160) String nome,
            @Size(max = 200) String razaoSocial,
            @Size(max = 18) String cnpj,
            @Email @Size(max = 200) String email,
            @Size(max = 30) String telefone,
            Boolean ativa
    ) {
    }

    private EmpresaResumo resumo(Empresa empresa) {
        long administradoresAtivos =
                usuarios.countByEmpresa_IdAndPerfilAndAtivoTrueAndEmailVerificadoTrueAndSenhaDefinidaTrue(
                        empresa.getId(),
                        PerfilUsuario.ADMIN
                );
        long administradoresPendentes = usuarios.countPendentesAtivacao(
                empresa.getId(),
                PerfilUsuario.ADMIN
        );
        return new EmpresaResumo(
                empresa.getId(),
                empresa.getNome(),
                empresa.getSlug(),
                empresa.getRazaoSocial(),
                empresa.getCnpj(),
                empresa.getEmail(),
                empresa.getTelefone(),
                empresa.isAtiva(),
                administradoresAtivos,
                administradoresPendentes,
                clientes.countByEmpresaId(empresa.getId()),
                empresa.getCriadoEm(),
                empresa.getAtualizadoEm()
        );
    }

    public record EmpresaResumo(
            Long id,
            String nome,
            String slug,
            String razaoSocial,
            String cnpj,
            String email,
            String telefone,
            boolean ativa,
            long administradoresAtivos,
            long administradoresPendentes,
            long clientesCadastrados,
            java.time.LocalDateTime criadoEm,
            java.time.LocalDateTime atualizadoEm
    ) {
    }
}
