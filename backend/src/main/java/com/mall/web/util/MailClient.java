package com.mall.web.util;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

public final class MailClient {
    private static final Properties PROPS = new Properties();

    static {
        try (InputStream inputStream = MailClient.class.getClassLoader().getResourceAsStream("db.properties")) {
            if (inputStream != null) {
                PROPS.load(inputStream);
            }
        } catch (Exception exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }

    private MailClient() {
    }

    public static void sendRegisterCode(String to, String code) throws Exception {
        String host = config("MAIL_HOST", "mail.host", "");
        String port = config("MAIL_PORT", "mail.port", "587");
        String username = config("MAIL_USERNAME", "mail.username", "");
        String password = config("MAIL_PASSWORD", "mail.password", "");
        String from = config("MAIL_FROM", "mail.from", username);
        String starttls = config("MAIL_STARTTLS", "mail.starttls", "true");
        String ssl = config("MAIL_SSL", "mail.ssl", "false");
        if (host.isBlank() || username.isBlank() || password.isBlank() || from.isBlank()) {
            throw new IllegalStateException("邮件配置不完整，请配置 MAIL_HOST、MAIL_USERNAME、MAIL_PASSWORD、MAIL_FROM");
        }

        Properties properties = new Properties();
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.host", host);
        properties.put("mail.smtp.port", port);
        properties.put("mail.smtp.starttls.enable", starttls);
        properties.put("mail.smtp.ssl.enable", ssl);
        properties.put("mail.smtp.connectiontimeout", "10000");
        properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");

        Session session = Session.getInstance(properties, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });

        MimeMessage message = new MimeMessage(session);
        message.setFrom(new InternetAddress(from, "XX 电子商务系统", StandardCharsets.UTF_8.name()));
        message.setRecipient(Message.RecipientType.TO, new InternetAddress(to));
        message.setSubject("注册验证码", StandardCharsets.UTF_8.name());
        message.setText("您的注册验证码是：" + code + "，5 分钟内有效。如非本人操作，请忽略本邮件。", StandardCharsets.UTF_8.name());
        Transport.send(message);
    }

    private static String config(String envName, String propName, String defaultValue) {
        String value = System.getenv(envName);
        if (value == null || value.isBlank()) {
            value = System.getProperty(envName);
        }
        if (value == null || value.isBlank()) {
            value = PROPS.getProperty(propName, defaultValue);
        }
        return value == null ? defaultValue : value;
    }
}
