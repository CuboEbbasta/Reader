/**
 * Stub minimo per la dipendenza opzionale @capacitor/synapse.
 * Il bundle "no-bundler" di @capacitor/filesystem si aspetta una variabile
 * globale "synapse" con un metodo exposeSynapse(). Serve solo per un
 * meccanismo di accesso ai file via schema custom su iOS (usato ad es. da
 * <img src="..."> su percorsi locali) che questa app non utilizza:
 * per le operazioni di lettura/scrittura file (usate per il backup)
 * non è necessario, quindi qui forniamo un'implementazione vuota.
 */
var synapse = { exposeSynapse: function () {} };
