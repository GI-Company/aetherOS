package server

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const authClaimsKey contextKey = "authClaims"

// simple HMAC secret for demo. In production: use KMS or public-key verification (RS256/ES256).
var hmacSecret = []byte("aether-secret")

// JWTAuthMiddleware validates Authorization header and stores claims in context.
func JWTAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "" {
			http.Error(w, "missing authorization", http.StatusUnauthorized)
			return
		}
		parts := strings.SplitN(auth, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			http.Error(w, "invalid authorization header", http.StatusUnauthorized)
			return
		}
		tokenStr := parts[1]

		// parse & validate
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			// ensure HMAC expected
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrTokenUnverifiable
			}
			return hmacSecret, nil
		})
		if err != nil || !token.Valid {
			http.Error(w, "invalid token: "+err.Error(), http.StatusUnauthorized)
			return
		}

		// store claims in context
		ctx := context.WithValue(r.Context(), authClaimsKey, token.Claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// FromContextClaims returns jwt.Claims from request context or nil.
func FromContextClaims(ctx context.Context) jwt.Claims {
	if c, ok := ctx.Value(authClaimsKey).(jwt.Claims); ok {
		return c
	}
	return nil
}
