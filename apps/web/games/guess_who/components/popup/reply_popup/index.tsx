import Image from "next/image";
import React, { useEffect } from "react";
import TickButton from "../../tick_button";
import CrossButton from "../../cross_button";
import { key_question } from "@/games/guess_who/GuessWho";
import { CharacterInfo, Trait } from "zknoid-chain-dev/dist/src/guess_who/GuessWho";
import { UInt64 } from "o1js";

interface ReplyPopupProps {
  question: string;
  onClick?: (answer: boolean) => void;
  character: CharacterInfo | null;
}

const ReplyPopup = (props: ReplyPopupProps) => {
  const [warning, setWarning] = React.useState(false);

  useEffect(() => {
    if (warning) {
      setTimeout(() => {
        setWarning(false);
      }, 1000);
    }
  }, [warning]);
  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#00000056] flex items-center justify-center">
      <div className="relative border-4 border-[#20d6d7] bg-[#0e6667] rounded-lg px-[20px] py-[30px] w-[500px] flex flex-col items-center justify-center">
        <div className="text-[20px] font-bold text-center">
          <p className="mb-[20px]">{props.question.replace("_", " ")}</p>
        </div>
        {warning && (
          <Image
            src="/guess-who/images/wrong_answer.png"
            width={100}
            height={100}
            className="absolute top-0 left-0 right-0 bottom-0 m-auto"
            alt="Warning"
          />
        )}
        <div className="flex justify-center gap-20 w-full mt-[20px]">
          <CrossButton
            onClick={() => {
              if (
                props.character &&
                props.character.traits.includes(UInt64.from(Trait.indexOf(key_question(props.question))))
              ) {
                setWarning(true);
              } else {
                props.onClick && props.onClick(true);
              }
            }}
          />
          <TickButton
            onClick={() => {
              if (
                props.character &&
                props.character.traits.includes(UInt64.from(Trait.indexOf(key_question(props.question))))
              ) {
                props.onClick && props.onClick(false);
              } else {
                setWarning(true);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ReplyPopup;
