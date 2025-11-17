import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Server running',
  });
});

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;