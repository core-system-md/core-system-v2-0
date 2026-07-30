with open("src/core/auth/AuthProvider.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old = """  const initialized = useRef(false);

  useEffect(() => {"""

new = """  const initialized = useRef(false);

  // P35 FIX: Prevent stale persisted state from bypassing auth check.
  // Zustand persist restores isAuthenticated=true before useEffect runs.
  if (!initialized.current) {
    store.boot();
  }

  useEffect(() => {"""

if old in content:
    content = content.replace(old, new)
    with open("src/core/auth/AuthProvider.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ P35 Fix applied successfully.")
else:
    print("❌ Pattern not found. Manual edit required.")
