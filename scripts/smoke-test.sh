#!/usr/bin/env bash
set -u
BASE="${BASE:-http://localhost:3000}"
JAR=$(mktemp)
trap 'rm -f "$JAR"' EXIT

csrf() { grep -P '\tcsrf_token\t' "$JAR" | awk '{print $NF}'; }

# 1. first visit mints the CSRF cookie
curl -s -o /dev/null -c "$JAR" -b "$JAR" "$BASE/"
echo "csrf cookie: $(csrf | cut -c1-16)…"

echo
echo "== 1. POST sem token CSRF =="
curl -s -o /dev/null -w 'status=%{http_code}\n' -X POST "$BASE/api/login" \
  -H 'Content-Type: application/json' -d '{"username":"alice","password":"senha123"}'

# helper: fetch a captcha and read the code straight out of the SVG
solve_captcha() {
  curl -s -c "$JAR" -b "$JAR" "$BASE/api/captcha?n=$RANDOM" \
    | grep -oP '(?<=>)[A-Z0-9](?=</text>)' | tr -d '\n'
}

login() { # $1=user $2=pass
  local code; code=$(solve_captcha)
  curl -s -c "$JAR" -b "$JAR" -w '\nstatus=%{http_code}\n' -X POST "$BASE/api/login" \
    -H 'Content-Type: application/json' \
    -d "$(printf '{"username":%s,"password":%s,"captcha":"%s","csrfToken":"%s"}' \
          "$(printf '%s' "$1" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" \
          "$(printf '%s' "$2" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" \
          "$code" "$(csrf)")"
}

echo
echo "== 2. CAPTCHA errado =="
curl -s -c "$JAR" -b "$JAR" -o /dev/null "$BASE/api/captcha?n=$RANDOM"
curl -s -c "$JAR" -b "$JAR" -w '\nstatus=%{http_code}\n' -X POST "$BASE/api/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"alice\",\"password\":\"senha123\",\"captcha\":\"ZZZZZ\",\"csrfToken\":\"$(csrf)\"}"

echo
echo "== 3. payload de injection na rota corrigida =="
login "' OR '1'='1' --" "qualquer"

echo
echo "== 4. cinco senhas erradas seguidas (bob) =="
for i in 1 2 3 4 5; do
  printf 'tentativa %s: ' "$i"
  login "bob" "errada$i" | tr '\n' ' '
  echo
done

echo
echo "== 5. sexta tentativa, agora com a senha certa =="
login "bob" "hunter2"

echo
echo "== 6. login valido (alice) =="
login "alice" "senha123"
echo "session cookie: $(grep -P '\tsession\t' "$JAR" | awk '{print $NF}' | cut -c1-16)…"

echo
echo "== 7. dashboard com a sessao =="
curl -s -b "$JAR" -o /dev/null -w 'status=%{http_code}\n' "$BASE/dashboard"

echo
echo "== 8. injection na rota vulneravel =="
JAR2=$(mktemp)
curl -s -o /dev/null -c "$JAR2" -b "$JAR2" "$BASE/login-injection"
CSRF2=$(grep -P '\tcsrf_token\t' "$JAR2" | awk '{print $NF}')
curl -s -c "$JAR2" -b "$JAR2" -w '\nstatus=%{http_code}\n' -X POST "$BASE/api/login-injection" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"' OR '1'='1' --\",\"password\":\"qualquer\",\"csrfToken\":\"$CSRF2\"}"
rm -f "$JAR2"
