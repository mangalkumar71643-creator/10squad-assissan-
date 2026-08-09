import React from "react";
import { StyleSheet, View } from "react-native";

import { Brick } from "@/types";

interface Props {
  bricks: Brick[];
}

function BrickGridInner({ bricks }: Props) {
  return (
    <>
      {bricks
        .filter((b) => b.alive)
        .map((b) => (
          <View
            key={b.id}
            style={[
              styles.brick,
              {
                left: b.x,
                top: b.y,
                width: b.width,
                height: b.height,
                backgroundColor: b.color,
                shadowColor: b.color,
              },
            ]}
          />
        ))}
    </>
  );
}

export const BrickGrid = React.memo(BrickGridInner);

const styles = StyleSheet.create({
  brick: {
    position: "absolute",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#FFFFFF33",
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
