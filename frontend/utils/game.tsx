import { useRouter } from "next/navigation";

export const startTetrisGame = (onStartGame: () => void) => {
  const router = useRouter();
  return () => {
    onStartGame();
    router.push("/game");
  };
};
