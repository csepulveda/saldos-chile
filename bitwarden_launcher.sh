#!/bin/bash



session=$(cat /tmp/bw_session)
if [ -z "$session" ]; then
    echo "Failed to retrieve session key."
    exit 1
fi
# Check if the session key is valid
if ! bw sync --session "$session"; then
    echo "Failed to sync Bitwarden. Please check your credentials."
    echo "Run 'bw unlock' to refresh your session."
    exit 1
fi

check_session() {
    if [ ! -f /tmp/bw_session ]; then
        create_session
    fi

    if ! bw sync --session "$session"; then
        echo "Failed to sync Bitwarden. Please check your credentials."
        create_session
    fi

}

create_session() {
    # Create a new session key
    bw unlock --raw > /tmp/bw_session
    if [ $? -ne 0 ]; then
        echo "Failed to unlock Bitwarden. Please check your credentials."
        exit 1
    fi
}

get_saldo_bci() {
    BCI_PASS=$(bw get password bci.cl --session $session)
    BCI_RUT=$(bw get username bci.cl --session $session)
    if [ -z "$BCI_PASS" ] || [ -z "$BCI_RUT" ]; then
        echo "Failed to retrieve credentials from Bitwarden."
        exit 1
    fi
    # Obtener saldo BCI:
    docker run -i -e BCI_RUT=$BCI_RUT -e BCI_PASS=$BCI_PASS --cap-add=SYS_ADMIN saldos-chile node bci-saldo.spec.js
}

get_saldo_santander() {
    SANTANDER_PASS=$(bw get password banco.santander.cl --session $session)
    SANTANDER_RUT=$(bw get username banco.santander.cl --session $session)
    if [ -z "$SANTANDER_PASS" ] || [ -z "$SANTANDER_RUT" ]; then
        echo "Failed to retrieve credentials from Bitwarden."
        exit 1
    fi
    # Obtener saldo Santander:
    docker run -i -e SANTANDER_RUT=$SANTANDER_RUT -e SANTANDER_PASS=$SANTANDER_PASS --cap-add=SYS_ADMIN saldos-chile node santander-saldo.spec.js
} 


get_saldo_bci &
get_saldo_santander &
wait

