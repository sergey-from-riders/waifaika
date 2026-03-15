package mail

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/smtp"
)

type Message struct {
	To      string
	Subject string
	HTML    string
	Text    string
}

type Mailer interface {
	Send(context.Context, Message) error
}

type SMTPMailer struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	FromName string
}

func (m SMTPMailer) Send(_ context.Context, msg Message) error {
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	body := "MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		fmt.Sprintf("From: %s <%s>\r\n", m.FromName, m.From) +
		fmt.Sprintf("To: %s\r\n", msg.To) +
		fmt.Sprintf("Subject: %s\r\n\r\n", msg.Subject) +
		msg.HTML

	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: m.Host, MinVersion: tls.VersionTLS12})
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, m.Host)
	if err != nil {
		return err
	}
	defer client.Close()

	if err := client.Auth(auth); err != nil {
		return err
	}
	if err := client.Mail(m.From); err != nil {
		return err
	}
	if err := client.Rcpt(msg.To); err != nil {
		return err
	}

	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write([]byte(body)); err != nil {
		_ = writer.Close()
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}

	return client.Quit()
}

type MemoryMailer struct {
	Messages []Message
}

func (m *MemoryMailer) Send(_ context.Context, msg Message) error {
	m.Messages = append(m.Messages, msg)
	return nil
}
