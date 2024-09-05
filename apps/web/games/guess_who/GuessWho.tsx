import * as React from 'react'
import { useGuessWhoMatchQueueStore, useObserveGuessWhoMatchQueue } from './stores/matchQueue'
import ZkNoidGameContext from '@/lib/contexts/ZkNoidGameContext'
import { useProtokitChainStore } from '@/lib/stores/protokitChain'
import { ClientAppChain } from 'zknoid-chain-dev'
import { guessWhoConfig } from './config'
import { useStore } from 'zustand'
import { useSessionKeyStore } from '@/lib/stores/sessionKeyStorage'
import GamePage from '@/components/framework/GamePage'
import RandzuCoverSVG from '../randzu/assets/game-cover.svg';
import RandzuCoverMobileSVG from '../randzu/assets/game-cover-mobile.svg';

enum GameState {
    NotStarted,
    MatchRegistration,
    Matchmaking,
    Active,
    Won,
    Lost,
}

const GuessWho = () => {

    useObserveGuessWhoMatchQueue()
    const [gameState, setGameState] = React.useState(GameState.NotStarted);

    // const competition = randzuCompetitions.find(
    //     (x) => x.id == params.competitionId,
    // );

    const { client } = React.useContext(ZkNoidGameContext);

    if (!client) {
        throw Error('Context app chain client is not set');
    }
    const matchQueue = useGuessWhoMatchQueueStore()
    const protokitChain = useProtokitChainStore();

    const client_ = client as ClientAppChain<
        typeof guessWhoConfig.runtimeModules,
        any,
        any,
        any
    >;

    const sessionPrivateKey = useStore(useSessionKeyStore, (state) =>
        state.getSessionKey()
    );

    const collectPending = async () => {
        const randzuLogic = client.runtime.resolve('GuessWhoGame');

        const tx = await client.transaction(
            sessionPrivateKey.toPublicKey(),
            async () => {
                randzuLogic.collectPendingBalance();
            }
        );

        console.log('Collect tx', tx);

        tx.transaction = tx.transaction?.sign(sessionPrivateKey);

        console.log('Sending tx', tx);

        await tx.send();

        console.log('Tx sent', tx);
    };

    React.useEffect(() => {
        if (matchQueue.inQueue && !matchQueue.activeGameId) {
            setGameState(GameState.Matchmaking);
        } else if (matchQueue.activeGameId) {
            setGameState(GameState.Active);
        } else {
            if (matchQueue.lastGameState == 'win')
                setGameState(GameState.Won);

            if (matchQueue.lastGameState == 'lost')
                setGameState(GameState.Lost);
        }

    }, [matchQueue.activeGameId, matchQueue.inQueue, matchQueue.lastGameState]);


    return (
        <GamePage
            gameConfig={guessWhoConfig}
            image={RandzuCoverSVG}
            mobileImage={RandzuCoverMobileSVG}
            defaultPage={'Game'}
        >
            This is the GuessWho
        </GamePage>
    )
}

export default GuessWho