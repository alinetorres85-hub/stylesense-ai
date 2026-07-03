// Imagem com pinça-para-zoom e arraste, em JS puro (PanResponder + Animated),
// sem dependências nativas extras. Toque duplo alterna zoom.

import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';

const MIN = 1;
const MAX = 5;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function ZoomableImage({ uri }: { uri: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // valores "fixados" no fim de cada gesto + leitura ao vivo via listeners
  const lastScale = useRef(1);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const curScale = useRef(1);
  const curX = useRef(0);
  const curY = useRef(0);
  const initialDist = useRef(0);
  const lastTap = useRef(0);

  useEffect(() => {
    const s = scale.addListener(({ value }) => (curScale.current = value));
    const x = translateX.addListener(({ value }) => (curX.current = value));
    const y = translateY.addListener(({ value }) => (curY.current = value));
    return () => {
      scale.removeListener(s);
      translateX.removeListener(x);
      translateY.removeListener(y);
    };
  }, [scale, translateX, translateY]);

  function reset() {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    lastScale.current = 1;
    lastX.current = 0;
    lastY.current = 0;
  }

  function zoomTo(s: number) {
    Animated.spring(scale, { toValue: s, useNativeDriver: true }).start();
    lastScale.current = s;
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const now = Date.now();
        if (now - lastTap.current < 280) {
          if (lastScale.current > 1) reset();
          else zoomTo(2.5);
          lastTap.current = 0;
        } else {
          lastTap.current = now;
        }
        initialDist.current = 0;
      },
      onPanResponderMove: (evt, gesture) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (initialDist.current === 0) initialDist.current = dist;
          const next = clamp(lastScale.current * (dist / initialDist.current), MIN, MAX);
          scale.setValue(next);
        } else if (touches.length === 1 && lastScale.current > 1) {
          const k = lastScale.current || 1;
          translateX.setValue(lastX.current + gesture.dx / k);
          translateY.setValue(lastY.current + gesture.dy / k);
        }
      },
      onPanResponderRelease: () => {
        lastScale.current = clamp(curScale.current, MIN, MAX);
        lastX.current = curX.current;
        lastY.current = curY.current;
        initialDist.current = 0;
        if (lastScale.current <= 1.02) reset();
      },
    }),
  ).current;

  return (
    <Animated.Image
      {...responder.panHandlers}
      source={{ uri }}
      resizeMode="contain"
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ scale }, { translateX }, { translateY }] },
      ]}
    />
  );
}
