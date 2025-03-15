import React, { useEffect, useRef, useState } from 'react';

interface Bird {
  y: number;
  velocity: number;
  rotation: number;
  frame: number;
}

interface Pipe {
  x: number;
  topHeight: number;
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
  scale: number;
  opacity: number;
}

const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 52;
const PIPE_GAP = 150;
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('flappyBirdHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [topScores] = useState([
    { name: "Player 1", score: 156 },
    { name: "Player 2", score: 143 },
    { name: "Player 3", score: 128 },
    { name: "Player 4", score: 115 },
    { name: "Player 5", score: 99 },
  ]);

  const birdRef = useRef<Bird>({ y: 250, velocity: 0, rotation: 0, frame: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const frameRef = useRef<number>(0);
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const assetsRef = useRef<{ [key: string]: HTMLImageElement }>({});

  // Load assets
  useEffect(() => {
    // Load bird sprites
    ['upflap', 'midflap', 'downflap'].forEach(flap => {
      const img = new Image();
      img.src = `https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/yellowbird-${flap}.png`;
      assetsRef.current[flap] = img;
    });

    // Load pipe and background
    const pipeImg = new Image();
    pipeImg.src = 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/pipe-green.png';
    assetsRef.current.pipe = pipeImg;

    const bgImg = new Image();
    bgImg.src = 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/background-day.png';
    assetsRef.current.background = bgImg;

    // Load sounds
    audioRef.current.wing = new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/wing.wav');
    audioRef.current.hit = new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/hit.wav');
    audioRef.current.point = new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/point.wav');

    // Initialize clouds with varying properties
    for (let i = 0; i < 5; i++) {
      cloudsRef.current.push({
        x: Math.random() * 800,
        y: Math.random() * 200,
        speed: 0.3 + Math.random() * 0.4,
        scale: 0.5 + Math.random() * 0.5,
        opacity: 0.4 + Math.random() * 0.3
      });
    }
  }, []);

  const jump = () => {
    if (!gameStarted) {
      setGameStarted(true);
      setGameOver(false);
      setScore(0);
      birdRef.current = { y: 250, velocity: 0, rotation: 0, frame: 0 };
      pipesRef.current = [];
    }
    if (!gameOver) {
      birdRef.current.velocity = JUMP_FORCE;
      birdRef.current.rotation = -20;
      audioRef.current.wing?.play();
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    birdRef.current = { y: 250, velocity: 0, rotation: 0, frame: 0 };
    pipesRef.current = [];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const drawCloud = (cloud: Cloud) => {
      ctx.save();
      ctx.globalAlpha = cloud.opacity;
      ctx.translate(cloud.x, cloud.y);
      ctx.scale(cloud.scale, cloud.scale);
      
      // Draw more realistic cloud shape
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.arc(25, -10, 25, 0, Math.PI * 2);
      ctx.arc(50, 0, 30, 0, Math.PI * 2);
      ctx.arc(25, 10, 25, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    };

    const getBirdSprite = () => {
      const frame = Math.floor(frameRef.current / 10) % 3;
      const sprites = ['upflap', 'midflap', 'downflap'];
      return assetsRef.current[sprites[frame]];
    };

    const gameLoop = () => {
      if (!gameStarted || gameOver) {
        frameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      frameRef.current++;

      // Update bird
      const bird = birdRef.current;
      bird.velocity += GRAVITY;
      bird.y += bird.velocity;
      bird.rotation += 2;
      if (bird.rotation > 70) bird.rotation = 70;
      bird.frame = (bird.frame + 1) % 3;

      // Update clouds
      cloudsRef.current.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x + 100 < 0) {
          cloud.x = canvas.width + 100;
          cloud.y = Math.random() * 200;
          cloud.opacity = 0.4 + Math.random() * 0.3;
        }
      });

      // Generate pipes
      if (frameRef.current % 100 === 0) {
        const topHeight = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
        pipesRef.current.push({ x: canvas.width, topHeight });
      }

      // Update pipes
      pipesRef.current = pipesRef.current
        .filter((pipe) => pipe.x > -PIPE_WIDTH)
        .map((pipe) => ({
          ...pipe,
          x: pipe.x - PIPE_SPEED,
        }));

      // Check collisions
      if (bird.y < 0 || bird.y > canvas.height) {
        setGameOver(true);
        audioRef.current.hit?.play();
      }

      pipesRef.current.forEach((pipe) => {
        if (
          bird.y < pipe.topHeight ||
          bird.y > pipe.topHeight + PIPE_GAP
        ) {
          if (
            bird.y + BIRD_HEIGHT > pipe.topHeight &&
            bird.y < pipe.topHeight + PIPE_GAP + BIRD_HEIGHT &&
            pipe.x < BIRD_WIDTH + 50 &&
            pipe.x + PIPE_WIDTH > 50
          ) {
            setGameOver(true);
            audioRef.current.hit?.play();
          }
        }
      });

      // Update score
      pipesRef.current.forEach((pipe) => {
        if (pipe.x + PIPE_WIDTH < 50 && pipe.x + PIPE_WIDTH > 47) {
          setScore((prev) => {
            const newScore = prev + 1;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('flappyBirdHighScore', newScore.toString());
            }
            audioRef.current.point?.play();
            return newScore;
          });
        }
      });

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      if (assetsRef.current.background) {
        const pattern = ctx.createPattern(assetsRef.current.background, 'repeat-x');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Draw clouds
      cloudsRef.current.forEach(drawCloud);

      // Draw pipes
      pipesRef.current.forEach((pipe) => {
        if (assetsRef.current.pipe) {
          // Top pipe (flipped)
          ctx.save();
          ctx.translate(pipe.x, pipe.topHeight);
          ctx.scale(1, -1);
          ctx.drawImage(assetsRef.current.pipe, 0, 0, PIPE_WIDTH, pipe.topHeight);
          ctx.restore();

          // Bottom pipe
          ctx.drawImage(
            assetsRef.current.pipe,
            pipe.x,
            pipe.topHeight + PIPE_GAP,
            PIPE_WIDTH,
            canvas.height - (pipe.topHeight + PIPE_GAP)
          );
        }
      });

      // Draw bird
      const birdSprite = getBirdSprite();
      if (birdSprite) {
        ctx.save();
        ctx.translate(50 + BIRD_WIDTH / 2, bird.y + BIRD_HEIGHT / 2);
        ctx.rotate((bird.rotation * Math.PI) / 180);
        ctx.drawImage(
          birdSprite,
          -BIRD_WIDTH / 2,
          -BIRD_HEIGHT / 2,
          BIRD_WIDTH,
          BIRD_HEIGHT
        );
        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(gameLoop);
    };

    frameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [gameStarted, gameOver, highScore]);

  return (
    <div className="min-h-screen bg-gray-700 p-4">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-4">
        {/* Left sidebar - Advertisement space */}
        <div className="lg:w-64 order-2 lg:order-1">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="bg-gray-600 rounded-lg p-4 shadow-lg">
              <h3 className="text-lg font-bold text-gray-200 mb-2">Advertisement</h3>
              <div className="h-32 lg:h-48 bg-gray-500 rounded flex items-center justify-center">
                <p className="text-gray-300 text-sm">Contact: ads@flappybird.game</p>
              </div>
            </div>
            <div className="bg-gray-600 rounded-lg p-4 shadow-lg">
              <h3 className="text-lg font-bold text-gray-200 mb-2">Sponsored</h3>
              <div className="h-32 lg:h-48 bg-gray-500 rounded flex items-center justify-center">
                <p className="text-gray-300 text-sm">Your Ad Here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main game area */}
        <div className="flex-1 order-1 lg:order-2">
          <div className="relative w-full max-w-[800px] mx-auto">
            <div className="relative pt-[62.5%]">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="absolute top-0 left-0 w-full h-full border-4 border-white rounded-lg cursor-pointer shadow-2xl"
                onClick={jump}
                onKeyDown={(e) => e.code === 'Space' && jump()}
                tabIndex={0}
              />
              {!gameStarted && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
                  <h1 className="text-2xl md:text-4xl font-bold mb-4 text-white text-shadow">Flappy Bird</h1>
                  <p className="text-lg md:text-xl mb-4 text-white text-shadow">Click or press Space to start</p>
                </div>
              )}
              {gameOver && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center bg-black bg-opacity-50 p-4 md:p-8 rounded-xl w-[90%] max-w-md">
                  <h2 className="text-2xl md:text-4xl font-bold mb-4 text-white">Game Over!</h2>
                  <p className="text-xl md:text-2xl mb-6 text-white">Score: {score}</p>
                  <button
                    className="bg-yellow-500 text-white px-6 md:px-8 py-2 md:py-3 rounded-full hover:bg-yellow-600 transition-colors text-lg md:text-xl font-bold shadow-lg transform hover:scale-105 transition-transform"
                    onClick={resetGame}
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 text-white text-xl md:text-2xl font-bold bg-black bg-opacity-30 px-6 md:px-8 py-3 md:py-4 rounded-full text-center">
              <p>Score: {score}</p>
              <p>High Score: {highScore}</p>
            </div>
          </div>
        </div>

        {/* Right sidebar - Leaderboard and Advertisement */}
        <div className="lg:w-64 order-3">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="bg-gray-600 rounded-lg p-4 shadow-lg">
              <h3 className="text-lg font-bold text-gray-200 mb-2">Top Scores</h3>
              <div className="space-y-2">
                {topScores.map((player, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-500 p-2 rounded">
                    <span className="font-medium text-gray-200">{player.name}</span>
                    <span className="text-yellow-600 font-bold">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-600 rounded-lg p-4 shadow-lg">
              <h3 className="text-lg font-bold text-gray-200 mb-2">Advertisement</h3>
              <div className="h-32 lg:h-48 bg-gray-500 rounded flex items-center justify-center">
                <p className="text-gray-300 text-sm">Contact: ads@flappybird.game</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};