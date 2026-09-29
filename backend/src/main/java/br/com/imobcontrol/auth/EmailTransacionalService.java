package br.com.imobcontrol.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailTransacionalService {

    private static final Logger log = LoggerFactory.getLogger(EmailTransacionalService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String smtpHost;
    private final String remetente;

    public EmailTransacionalService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${spring.mail.host:}") String smtpHost,
            @Value("${spring.mail.username:}") String smtpUsername,
            @Value("${imobcontrol.mail-from:}") String remetente
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.smtpHost = smtpHost;
        this.remetente = remetente != null && !remetente.isBlank()
                ? remetente.trim()
                : smtpUsername == null ? "" : smtpUsername.trim();
    }

    public boolean disponivel() {
        return smtpHost != null
                && !smtpHost.isBlank()
                && remetente != null
                && !remetente.isBlank()
                && mailSenderProvider.getIfAvailable() != null;
    }

    public boolean enviar(String destino, String assunto, String texto) {
        if (!disponivel()) {
            log.warn("Envio de e-mail não configurado; mensagem para {} não foi enviada", destino);
            return false;
        }

        try {
            SimpleMailMessage mensagem = new SimpleMailMessage();
            mensagem.setFrom(remetente);
            mensagem.setTo(destino);
            mensagem.setSubject(assunto);
            mensagem.setText(texto);
            mailSenderProvider.getObject().send(mensagem);
            return true;
        } catch (RuntimeException ex) {
            log.error("Falha ao enviar e-mail transacional para {}", destino, ex);
            return false;
        }
    }
}
