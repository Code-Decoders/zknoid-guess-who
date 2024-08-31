import { RuntimeModule, runtimeModule } from '@proto-kit/module';
import {
  Bool,
  Field,
  Poseidon,
  PublicKey,
  Struct,
  UInt64,
} from 'o1js';

import { state, runtimeMethod } from '@proto-kit/module';
import { State, StateMap, assert } from '@proto-kit/protocol';
import { MatchMaker } from 'src/engine';
import { Lobby } from 'src/engine';

interface GuessWhoConfig { }

const GW_COLUMN_LENGTH = 4
const GW_ROW_LENGTH = 6

// Creating a Trait type which can have any of the give traits which can be used as a list in CharacterInfo
export type Trait = "glasses" | "necklace" | "bald" | "mustache" | "beard" | "male" | "female" |
  "brown" | "white" | "tie" | "earrings" | "bunny_ears" | "bandana" | "glasses" | "black" | "mouth_open"

export const questions: String[] = []

// There are two ways of introducing character to the chain, either we can create a regular list of characters, that is reintialized and randomized at the start of every game, or
// we can create a proper CharacterInfo Struct for each character in a list and the can create a randomizing the pre built list each time a new game is created.
// export type CharacterInfo = {
//   name: String,
//   traits: Array<Trait>,
//   pos: UInt64,
//   isPicked: Bool,
//   isCancelled: Bool
// }
// const characters: CharacterInfo[] = []

// As for the board, instead of creating a 2d array or a grid, we can create a 1d array for less complication, and there are no drawbacks for it as of now.
export class CharacterInfo extends Struct({
  name: String,
  traits: Array<Trait>,
  pos: UInt64,
  isPicked: Bool,
  isCancelled: Bool
}) { }

export class GameCycle extends Struct({
  question: UInt64,
  response: Bool,
  moves: Array<UInt64> // Moves here represent the positions of characters crossed out for that cycle.
}) { }

export class GameInfo extends Struct({
  player1: PublicKey,
  player2: PublicKey,
  currentMoveUser: PublicKey,
  lastMoveBlockHeight: UInt64,
  cycles: Array<GameCycle>,
  winner: PublicKey,
}) { }

export class WinWitness extends Struct({

}) { }

export class GuessWhoField extends Struct({

}) { }

@runtimeModule()
export class GuessWhoGame extends MatchMaker {
  public override async initGame(lobby: Lobby, shouldInit: Bool): Promise<UInt64> {
    var returnVal: UInt64 = UInt64.from(0)

    return returnVal
  }
}
