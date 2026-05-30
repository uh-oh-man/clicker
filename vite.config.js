export default defineConfig({
  base: "/clicker/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["uhohman06-himalayas.nord"],
  },
});
