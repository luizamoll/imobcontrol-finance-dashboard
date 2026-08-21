package br.com.imobcontrol.api;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ApiInfoController {

    @GetMapping
    public Map<String, String> info() {
        return Map.of(
            "application", "ImobControl API",
            "status", "em desenvolvimento"
        );
    }
}
