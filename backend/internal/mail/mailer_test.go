package mail

import (
	"context"
	"testing"
)

func TestRejectHeaderInjectionBeforeConnecting(t *testing.T) {
	err := (SMTPMailer{}).Send(context.Background(), Message{To: "test@example.test\r\nBcc: attacker@example.test"})
	if err == nil || err.Error() != "invalid mail header" {
		t.Fatalf("unexpected result: %v", err)
	}
}

func TestUnconfiguredProductionMailerDoesNotClaimDelivery(t *testing.T) {
	if (UnavailableMailer{}).Send(context.Background(), Message{}) == nil {
		t.Fatal("unconfigured mail succeeded")
	}
}
