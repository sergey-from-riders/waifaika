package mail

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"sync"
	"time"
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

func (m SMTPMailer) Send(ctx context.Context, msg Message) error {
	for _, header := range []string{m.From, m.FromName, msg.To, msg.Subject} {
		if strings.ContainsAny(header, "\r\n") {
			return fmt.Errorf("invalid mail header")
		}
	}
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	body := "MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		fmt.Sprintf("From: %s <%s>\r\n", m.FromName, m.From) +
		fmt.Sprintf("To: %s\r\n", msg.To) +
		fmt.Sprintf("Subject: %s\r\n\r\n", msg.Subject) +
		msg.HTML

	dialer := &tls.Dialer{NetDialer: &net.Dialer{Timeout: 10 * time.Second}, Config: &tls.Config{ServerName: m.Host, MinVersion: tls.VersionTLS12}}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return err
	}
	defer conn.Close()
	deadline := time.Now().Add(20 * time.Second)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	if err := conn.SetDeadline(deadline); err != nil {
		return err
	}

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
	mu       sync.Mutex
	Messages []Message
}

func (m *MemoryMailer) Send(_ context.Context, msg Message) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Messages = append(m.Messages, msg)
	return nil
}

type UnavailableMailer struct{}

func (UnavailableMailer) Send(context.Context, Message) error {
	return fmt.Errorf("SMTP is not configured")
}
