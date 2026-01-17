export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-24">
      <h1 className="text-4xl font-bold mb-8">Login</h1>
      <form className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="email"
          placeholder="Email address"
          className="p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
        />
        <input
          type="password"
          placeholder="Password"
          className="p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
        />
        <button className="bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700">
          Sign In
        </button>
      </form>
    </div>
  );
}
