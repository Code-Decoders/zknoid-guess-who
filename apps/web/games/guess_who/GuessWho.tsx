import * as React from 'react';
import {
    useGuessWhoMatchQueueStore,
    useObserveGuessWhoMatchQueue,
} from './stores/matchQueue';
import ZkNoidGameContext from '@/lib/contexts/ZkNoidGameContext';
import { useProtokitChainStore } from '@/lib/stores/protokitChain';
import { ClientAppChain } from 'zknoid-chain-dev';
import { guessWhoConfig } from './config';
import { useStore } from 'zustand';
import { useSessionKeyStore } from '@/lib/stores/sessionKeyStorage';
import GamePage from '@/components/framework/GamePage';
import RandzuCoverSVG from '../randzu/assets/game-cover.svg';
import RandzuCoverMobileSVG from '../randzu/assets/game-cover-mobile.svg';
import Image from 'next/image';
import styles from './page.module.css';
import CharacterCard from './components/cards/character_card';
import QuestionRow from './components/question_row';
import StartPopup from './components/popup/start_popup';
import EndPopup from './components/popup/end_popup';
import ReplyPopup from './components/popup/reply_popup';
import { character_data, key_question, question_key } from './_data/character_data';
import { Bool, CircuitString, UInt64 } from 'o1js';
import { CharacterInfo, characters, questions, Trait } from './lib/types';
import { useNetworkStore } from '@/lib/stores/network';
import { useToasterStore } from '@/lib/stores/toasterStore';
import { useRateGameStore } from '@/lib/stores/rateGameStore';
import { useStartGame } from './features/startGame';
import { DEFAULT_PARTICIPATION_FEE } from 'zknoid-chain-dev/dist/src/engine/LobbyManager';
import {
    useLobbiesStore,
    useObserveLobbiesStore,
} from '@/lib/stores/lobbiesStore';
import { api } from '@/trpc/react';
import { useContext, useState } from 'react';
import { Board } from 'zknoid-chain-dev/dist/src/guess_who/GuessWho';
import WaitingPopup from './components/popup/waiting';

// export const key_question = (question: string): string => {
//     const trait = question.split(' ').at(-1)?.replace('?', '')!;
//     return trait;
// };

enum GameState {
    NotStarted,
    MatchRegistration,
    Matchmaking,
    Active,
    Won,
    Lost,
    Waiting
}

interface CharacterData {
    [key: string]: any;
}


const competition = {
    id: 'global',
    name: 'Global competition',
    enteringPrice: BigInt(+DEFAULT_PARTICIPATION_FEE.toString()),
    prizeFund: 0n,
};

const GuessWho = () => {
    const [gameState, setGameState] = useState<GameState>(GameState.NotStarted);
    const [isRateGame, setIsRateGame] = useState<boolean>(true);
    const [loading, setLoading] = useState(true);
    const [loadingElement, setLoadingElement] = React.useState<
        { x: number; y: number } | undefined
    >({ x: 0, y: 0 });
    const { client } = useContext(ZkNoidGameContext);

    if (!client) {
        throw Error('Context app chain client is not set');
    }

    const networkStore = useNetworkStore();
    const toasterStore = useToasterStore();
    const rateGameStore = useRateGameStore();
    const protokitChain = useProtokitChainStore();
    useObserveGuessWhoMatchQueue();
    const matchQueue = useGuessWhoMatchQueueStore();
    const progress = api.progress.setSolvedQuests.useMutation();
    const startGame = useStartGame(competition.id, setGameState);
    const getRatingQuery = api.ratings.getGameRating.useQuery({
        gameId: 'guess-who',
    });



    const client_ = client as ClientAppChain<
        typeof guessWhoConfig.runtimeModules,
        any,
        any,
        any
    >;

    const query = networkStore.protokitClientStarted
        ? client_.query.runtime.GuessWhoGame
        : undefined;

    useObserveLobbiesStore(query);
    const lobbiesStore = useLobbiesStore();

    console.log('Active lobby', lobbiesStore.activeLobby);

    const restart = () => {
        matchQueue.resetLastGameState();
        setGameState(GameState.NotStarted);
    };

    const sessionPrivateKey = useStore(useSessionKeyStore, (state) =>
        state.getSessionKey()
    );

    const collectPending = async () => {
        const guessWhoGame = client!.runtime.resolve('GuessWhoGame');

        const tx = await client!.transaction(
            sessionPrivateKey.toPublicKey(),
            async () => {
                guessWhoGame.collectPendingBalance();
            }
        );

        console.log('Collect tx', tx);

        tx.transaction = tx.transaction?.sign(sessionPrivateKey);
        console.log('Sending tx', tx);
        await tx.send();
        console.log('Tx sent', tx);
    };

    React.useEffect(() => {

        // if (matchQueue.gameInfo?.parsed.currentCycle) {
        //     setGameState(GameState.Waiting)
        // }

        if (matchQueue.inQueue && !matchQueue.activeGameId) {
            setGameState(GameState.Matchmaking);
        } else if (matchQueue.activeGameId) {
            setGameState(GameState.Active);
        } else {
            if (matchQueue.lastGameState == 'win') setGameState(GameState.Won);

            if (matchQueue.lastGameState == 'lost') setGameState(GameState.Lost);
        }
    }, [matchQueue.activeGameId, matchQueue.inQueue, matchQueue.lastGameState]);

    const selectCharacter = async (index: UInt64) => {
        if (!matchQueue.gameInfo?.isCurrentUserMove) return;
        console.log('After checks');

        const guessWhoGame = client.runtime.resolve('GuessWhoGame');

        const tx = await client.transaction(
            sessionPrivateKey.toPublicKey(),
            async () => {
                guessWhoGame.selectCharacter(
                    UInt64.from(matchQueue.gameInfo!.gameId),
                    index
                );
            }
        );

        setLoading(true);

        tx.transaction = tx.transaction?.sign(sessionPrivateKey);
        await tx.send();

        setLoading(false);
    };

    const askQuestion = async (index: UInt64) => {
        if (!matchQueue.gameInfo?.isCurrentUserMove) return;
        console.log('After checks');

        const guessWhoGame = client.runtime.resolve('GuessWhoGame');

        const tx = await client.transaction(
            sessionPrivateKey.toPublicKey(),
            async () => {
                guessWhoGame.askQuestion(
                    UInt64.from(matchQueue.gameInfo!.gameId),
                    index
                );
            }
        );

        setLoading(true);

        tx.transaction = tx.transaction?.sign(sessionPrivateKey);
        await tx.send();

        setLoading(false);
    };

    const respond = async (response: Bool) => {
        if (!matchQueue.gameInfo?.isCurrentUserMove) return;
        console.log('After checks');

        const guessWhoGame = client.runtime.resolve('GuessWhoGame');

        const tx = await client.transaction(
            sessionPrivateKey.toPublicKey(),
            async () => {
                guessWhoGame.respond(
                    UInt64.from(matchQueue.gameInfo!.gameId),
                    response
                );
            }
        );

        setLoading(true);

        tx.transaction = tx.transaction?.sign(sessionPrivateKey);
        await tx.send();

        setLoading(false);
    };

    const makeMove = async (chars: CharacterInfo[]) => {
        const dummyCharInfo: CharacterInfo = {
            id: UInt64.from(100),
            name: CircuitString.fromString('NaN'),
            traits: [
                UInt64.from(15),
                UInt64.from(15),
                UInt64.from(15),
                UInt64.from(15),
                UInt64.from(15),
                UInt64.from(15),
            ],
            pos: UInt64.from(0),
            isPicked: Bool(false),
            isCancelled: Bool(false),
        };
        const finalChars = chars.map((char) => {
            return {
                ...char,
                isCancelled: Bool(true),
            }
        });
        if (!matchQueue.gameInfo?.isCurrentUserMove) return;
        console.log('After checks');

        const prepBoard: Board = new Board({
            value: [
                ...Array<CharacterInfo>(24 - chars.length).fill(dummyCharInfo),
                ...finalChars,
            ],
        });

        console.log(prepBoard.value.map((val) => val.id));

        const guessWhoGame = client.runtime.resolve('GuessWhoGame');

        const tx = await client.transaction(
            sessionPrivateKey.toPublicKey(),
            async () => {
                guessWhoGame.makeMove(
                    UInt64.from(matchQueue.gameInfo!.gameId),
                    prepBoard
                );
            }
        );

        setLoading(true);

        tx.transaction = tx.transaction?.sign(sessionPrivateKey);
        await tx.send();

        setLoading(false);
    };

    const [character, setCharacter] = React.useState<CharacterData | null>();
    const [selectQuestion, setSelectQuestion] = React.useState<string>("");
    const [givenAnswer, setGivenAnswer] = React.useState<boolean | null>(null);
    const [remainingQuestion, setRemainingQuestion] =
        React.useState<string[]>(questions);

    const [winner, setWinner] = React.useState<number>(-1);
    const [status, setStatus] = React.useState<string>("overlay");
    const [botCharacter, _] = React.useState<CharacterData | null>(
        character_data[Math.floor(Math.random() * character_data.length)]
    );
    const [opponentElimatedCharacters, setOpponentElimatedCharacters] = React.useState<
        number[]
    >([]);

    const [wildCard, setWildCard] = React.useState<number | null>();
    const [tempElimatedCharacters, setTempElimatedCharacters] = React.useState<
        number[]
    >([]);

    const [elimateCharacters, setElimateCharacters] = React.useState<number[]>(
        []
    );

    React.useEffect(() => {
        if (elimateCharacters.length === character_data.length - 1) {
            setStatus("end");
            let winnerCharacter = character_data.filter(
                (e) => !elimateCharacters.includes(e.id)
            )[0];
            if (winnerCharacter === botCharacter) {
                setWinner(0);
            } else {
                setWinner(1);
            }
        } else if (opponentElimatedCharacters.length === character_data.length - 1) {
            setStatus("end");
            setWinner(1);
        }
    }, [elimateCharacters, opponentElimatedCharacters]);

    React.useEffect(() => {
        if (matchQueue.gameInfo) {
            setGameState(matchQueue.gameInfo.isCurrentUserMove ? GameState.Active : GameState.Waiting)
            setCharacter(character_data[(matchQueue.gameInfo?.player1.toBase58() === networkStore.address ? matchQueue.gameInfo?.parsed?.player1Board.find((e: any) => e.isPicked)?.id : matchQueue.gameInfo?.parsed?.player2Board.find((e: any) => e.isPicked)?.id)])

            setOpponentElimatedCharacters(matchQueue.gameInfo?.player1.toBase58() === networkStore.address ?
                matchQueue.gameInfo?.parsed?.player2Board.filter((e: any) => e.isCancelled).map((e: any) => e.id) :
                matchQueue.gameInfo?.parsed?.player1Board.filter((e: any) => e.isCancelled).map((e: any) => e.id)
            )
            setElimateCharacters(matchQueue.gameInfo?.player1.toBase58() === networkStore.address ?
                matchQueue.gameInfo?.parsed?.player1Board.filter((e: any) => e.isCancelled).map((e: any) => e.id) :
                matchQueue.gameInfo?.parsed?.player2Board.filter((e: any) => e.isCancelled).map((e: any) => e.id)
            )
        }

    }, [matchQueue.gameInfo])

    React.useEffect(() => {
        if (gameState == GameState.Active) {
            const currentPhase = matchQueue.gameInfo?.parsed.currentCycle.phase;

            switch (currentPhase) {
                case 0:
                    setStatus("question");
                    break;
                case 1:
                    setSelectQuestion(questions[matchQueue.gameInfo?.parsed.currentCycle.question]);
                    setStatus("reply");
                    break;
                case 2:
                    if (givenAnswer === null) {
                        setStatus("answer");
                        setSelectQuestion(questions[matchQueue.gameInfo?.parsed.currentCycle.question]);
                    } else {
                        setSelectQuestion(questions[matchQueue.gameInfo?.parsed.currentCycle.question]);
                        setGivenAnswer(matchQueue.gameInfo?.parsed.currentCycle.answer);
                    }
                    break;
                default:
                    setStatus("question");
                    break;
            }
        }
    }, [gameState])

    return (
        <GamePage
            gameConfig={guessWhoConfig}
            image={RandzuCoverSVG}
            mobileImage={RandzuCoverMobileSVG}
            defaultPage={'Game'}
        >
            <div className={styles.container}>
                <div className="flex-1 px-4 py-4">
                    <div className="grid grid-cols-6 gap-2">
                        {character_data.map((character, index) => (
                            <CharacterCard
                                key={index}
                                id={index}
                                elimated={
                                    elimateCharacters.includes(character.id) ||
                                    tempElimatedCharacters.includes(character.id)
                                }
                                character={character}
                                onChange={(e) => {
                                    if (status === "selection") {
                                        setCharacter(character);
                                    } else if (status === "elimate") {
                                        if (!elimateCharacters.includes(character.id)) {
                                            setTempElimatedCharacters((prev) =>
                                                prev.includes(character.id)
                                                    ? prev.filter((el) => el !== character.id)
                                                    : [...prev, character.id]
                                            );
                                        }
                                    }
                                }}
                            />
                        ))}
                    </div>
                    <QuestionRow
                        status={status}
                        questions={remainingQuestion}
                        onCheck={(index) => {
                            if (status === "question") {
                                setSelectQuestion(remainingQuestion[index]);
                                setRemainingQuestion((prev) => prev.filter((e) => e !== remainingQuestion[index]));
                                askQuestion(UInt64.from(index));
                                setGameState(GameState.Waiting)
                                setStatus("elimate");
                            } else if (status === "elimate") {
                                const toMove = tempElimatedCharacters.map((e) => matchQueue.gameInfo?.player1Board.value[e]!);
                                makeMove(toMove);
                                setGameState(GameState.Waiting)
                                setStatus("reply");
                            } else {
                                selectCharacter(UInt64.from(character?.id))
                            }
                        }}
                    />
                </div>
                <div className="flex flex-col items-center">
                    <Image
                        src={"/guess-who/images/guess_who.png"}
                        alt="Guess Who"
                        width={100}
                        height={100}
                        className="w-full"
                    />
                    <div className="bg-[#20d6d7] p-2 mb-[20px]">
                        {character ? (
                            <Image
                                src={character.image}
                                width={100}
                                height={100}
                                alt="Character Image"
                            />
                        ) : (
                            <div className="h-[100px] w-[100px]" />
                        )}
                    </div>
                    <div className="bg-[#0c4a49] p-2 mb-[20px]">
                        <Image
                            src={"/guess-who/images/character_hidden.png"}
                            width={100}
                            height={100}
                            alt="Character Hidden"
                        />
                    </div>
                    <div className="text-[15px] font-bold">
                        <p>Guess Character</p>
                    </div>
                    <select
                        className="border-2 border-white bg-transparent outline-none p-2 rounded-lg"
                        onChange={(e: any) => {
                            setWildCard(parseInt(e.target.value));
                        }}
                    >
                        <option defaultChecked disabled>
                            Select Character
                        </option>
                        {character_data.map((character, index) => (
                            <option key={index} value={character.id}>
                                {character.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="bg-transparent w-full p-2 mt-[10px] border-2 border-white rounded-lg"
                        onClick={() => {
                            if (wildCard) {
                                if (wildCard === botCharacter?.id) {
                                    setWinner(0);
                                } else {
                                    setWinner(1);
                                }
                                setStatus("end");
                            }
                        }}
                    >
                        <p className="font-bold text-white">Submit</p>
                    </button>
                    <div className="grid grid-cols-6 gap-0 mt-[10px]">
                        {Array.from(character_data).map((character, index) => (
                            <Image
                                key={index}
                                src={
                                    opponentElimatedCharacters.includes(character.id)
                                        ? "/guess-who/images/character_removed.png"
                                        : "/guess-who/images/character_mini_hidden.png"
                                }
                                width={50}
                                height={50}
                                alt="Character Hidden"
                                className="h-[25px] w-[25px]"
                            />
                        ))}
                    </div>
                </div>
                {gameState !== GameState.Waiting && status === "answer" && (
                    <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#00000056] flex items-center justify-center">
                        <div className="absolute border-4 border-[#20d6d7] bg-[#0e6667] rounded-lg px-[20px] py-[30px] w-[500px] flex flex-col items-center justify-center">
                            <div className="text-[20px] font-bold text-center">
                                <p className="mb-[20px]">{selectQuestion}</p>
                                <p>
                                    {botCharacter && botCharacter[question_key(selectQuestion)]
                                        ? "Yes"
                                        : "No"}
                                </p>
                            </div>
                            <Image
                                src={"/guess-who/images/tick_default.png"}
                                width={50}
                                height={50}
                                alt="Tick"
                                className="mt-[20px]"
                                onClick={() => {
                                    setStatus("elimate");
                                }}
                            />
                        </div>
                    </div>
                )}
                {
                    gameState === GameState.Waiting ?
                        (<WaitingPopup />) :
                        (<>
                            {status === "reply" && (
                                <ReplyPopup
                                    character={character!}
                                    question={selectQuestion}
                                    onClick={(answer) => {
                                        respond(Bool(answer))
                                        setGameState(GameState.Waiting)
                                        setStatus("question");
                                    }}
                                />
                            )}
                            {status === "end" && (
                                <EndPopup
                                    character={winner === 0 ? botCharacter : character!}
                                    winner={winner}
                                />
                            )}
                            {status === "overlay" && (
                                <StartPopup onClick={() => setStatus("selection")} />
                            )}

                        </>)
                }
            </div>
        </GamePage>

    );
};

export default GuessWho;
