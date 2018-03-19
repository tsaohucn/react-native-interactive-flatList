import React, { Component, PureComponent } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  StyleSheet,
  PanResponder,
  Platform,
  Animated,
  Easing,
  FlatList,
  Image,
  Dimensions,
  Button,
  InteractionManager,
  Text
} from 'react-native'
import TimerMixin from 'react-timer-mixin'
import ComicBookImage from './ComicBookImage'
import {
  PanGestureHandler,
  TapGestureHandler,
  PinchGestureHandler,
  State
} from 'react-native-gesture-handler'

const { width, height } = Dimensions.get('window')

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

export default class NativeComicBook extends Component {

  static propTypes = {
    ...View.propTypes,
    scalable: PropTypes.bool,
    content: PropTypes.array
  }

  static defaultProps = {
    scalable: true,
    content: new Array
  }

  constructor(props) {
    super(props)
    // 滾動
    this.state = {
      animatedScale: new Animated.Value(1),
      animatedoffsetX: new Animated.Value(0),
      animatedoffsetY: new Animated.Value(0)
    }
    // 縮放
    this.lastScale = 1
    this.focusPointX = 0
    this.scrollOffset = 0
    this.contentHeight = height
    this.isSingleReleasePan = true
    this.isDoubleReleasePan = true
    this.lastTranslationX = null
    this.lastTranslationY = null
    this.lastPointX = null
    this.lastPointY = null
    this.singleTapY = null
    this.doubleTapX = null
    this.doubleTapY = null
    this.focusPointX = null
    this.focusPointY = null
  }

  onSingleTap = event => {
    if (event.nativeEvent.state === State.BEGAN) {
      this.singleTapY = event.nativeEvent.absoluteY
    }
    if (this.state.animatedScale._value ===  1 && event.nativeEvent.state === State.ACTIVE) {
      if (this.singleTapY <= height/3) {
        const scrollOffset = this.scrollOffset - height/3 < 0 ? 0 : this.scrollOffset - height/3
        this.flatlist.getNode().scrollToOffset({
          offset: scrollOffset,
          animated: true,
        })
      } else if (this.singleTapY > height/3 && this.singleTapY < height*2/3) {
        console.warn('功能選單')
      } else {
        const scrollOffset = this.scrollOffset + height/3 > this.contentHeight ? this.contentHeight :this.scrollOffset + height/3
        this.flatlist.getNode().scrollToOffset({
          offset: scrollOffset,
          animated: true,
        })
      }    
    }
  }

  onDoubleTap = event => {
    if (event.nativeEvent.state === State.BEGAN) {
      this.doubleTapX = (event.nativeEvent.absoluteX - width/2)
      this.doubleTapY = (event.nativeEvent.absoluteY - height/2)
    }
    if (event.nativeEvent.state === State.ACTIVE) {
      const dx = this.doubleTapX - (event.nativeEvent.absoluteX - width/2)
      const dy = this.doubleTapY - (event.nativeEvent.absoluteY - height/2)
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 20) {
        if (this.state.animatedScale._value ===  1 ) {
          Animated.parallel([
            Animated.timing(this.state.animatedScale,{
              toValue: 2,
              duration: 200
            }),
            Animated.timing(this.state.animatedoffsetX,{
              toValue: -this.doubleTapX/2, // -A/2
              duration: 200
            }),
            Animated.timing(this.state.animatedoffsetY,{
              toValue: -this.doubleTapY/2, // -A/2
              duration: 200
            })
          ]).start(result => {
            if (result.finished) {
              this.lastScale = 2
              //this.flatlist.setNativeProps({scrollEnabled: false})
            }          
          })
        } else if (this.state.animatedScale._value > 1 ) {
          Animated.parallel([
            Animated.timing(this.state.animatedScale,{
              toValue: 1,
              duration: 200
            }),
            Animated.timing(this.state.animatedoffsetX,{
              toValue: 0,
              duration: 200
            }),
            Animated.timing(this.state.animatedoffsetY,{
              toValue: 0,
              duration: 200
            })
          ]).start(result => {
            if (result.finished) {
              this.lastScale = 1
              this.flatlist.setNativeProps({scrollEnabled: true})
            }            
          })
        }
      }
    }
  }

  onPinch = event => {
    if (event.nativeEvent.numberOfTouches === 2) {
      let scale = (event.nativeEvent.scale-1)+this.lastScale
      console.log(event.nativeEvent.scale)
      if (scale > 3) {
        scale = 3
      } else if (scale < 0.5) {
        scale = 0.5
      }
      Animated.event(
        [{ scale: this.state.animatedScale}]
      )({scale: scale})
    } else {
      // 把ios改成放掉單手重設event.nativeEvent.scale為1
  
    }
  }

  onPanStart = event => {
    this.flatlist.setNativeProps({scrollEnabled: false})
  }

  onPan = event => {
    if (event.nativeEvent.numberOfTouches === 2) {
      if (this.isSingleReleasePan || this.isDoubleReleasePan) {
        this.isSingleReleasePan = false
        this.isDoubleReleasePan = false
        this.focusPointX = (event.nativeEvent.absoluteX - width/2)/this.state.animatedScale._value - this.state.animatedoffsetX._value
        this.focusPointY = (event.nativeEvent.absoluteY - height/2)/this.state.animatedScale._value - this.state.animatedoffsetY._value

      }
      const magnifierCenterX = event.nativeEvent.absoluteX - width/2 // 目前雙手中心
      const magnifierCenterY = event.nativeEvent.absoluteY - height/2 // 目前雙手中心
      const offsetX = magnifierCenterX/this.state.animatedScale._value-this.focusPointX // 關注點到雙手中心需要的偏移量
      const offsetY = magnifierCenterY/this.state.animatedScale._value-this.focusPointY // 關注點到雙手中心需要的偏移量
      if (this.state.animatedScale._value > 1) { 
        // 限制放大超過邊界時的偏移速度
        const offsetBoundaryX = (this.state.animatedScale._value*width/2-width/2)/this.state.animatedScale._value
        const offsetBoundaryY = (this.state.animatedScale._value*height/2-height/2)/this.state.animatedScale._value
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/this.state.animatedScale._value) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(this.state.animatedScale._value*1.5)) : offsetY
      }
      Animated.event(
        [{ offsetX: this.state.animatedoffsetX,
           offsetY: this.state.animatedoffsetY
        }]
      )({offsetX: offsetX,offsetY: offsetY})
    } else {
      if (this.isDoubleReleasePan || !this.isSingleReleasePan) {
        this.isDoubleReleasePan = false
        this.isSingleReleasePan = true
        this.lastTranslationX = this.state.animatedoffsetX._value
        this.lastTranslationY = this.state.animatedoffsetY._value
        this.lastPointX = event.nativeEvent.absoluteX
        this.lastPointY = event.nativeEvent.absoluteY
      }
      if (this.state.animatedScale._value > 1) {
        const diffX = (event.nativeEvent.absoluteX - this.lastPointX)/3
        const diffY = (event.nativeEvent.absoluteY - this.lastPointY)/3
        const offsetX = diffX + this.lastTranslationX
        const offsetY = diffY + this.lastTranslationY
        const offsetBoundaryX = (this.state.animatedScale._value*width/2-width/4)/this.state.animatedScale._value
        const offsetBoundaryY = (this.state.animatedScale._value*height/2-height/4)/this.state.animatedScale._value
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) : offsetY
        Animated.event(
          [{ offsetX: this.state.animatedoffsetX,
             offsetY: this.state.animatedoffsetY
          }]
        )({offsetX: offsetX,offsetY: offsetY})
      }
    }
  }

  onPanEnd = event => {
    this.isDoubleReleasePan = true
    this.isSingleReleasePan = true
    // 兩隻手放開才執行
    if (this.state.animatedScale._value < 1) {
      Animated.parallel([
        Animated.timing(this.state.animatedScale,{
          toValue: 1,
          duration: 200
        }),
        Animated.timing(this.state.animatedoffsetX,{
          toValue: 0,
          duration: 200
        }),
        Animated.timing(this.state.animatedoffsetY,{
          toValue: 0,
          duration: 200
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = 1
          this.flatlist.setNativeProps({scrollEnabled: true})
        }
      })
    } else if (this.state.animatedScale._value === 1) {
      this.flatlist.setNativeProps({scrollEnabled: true})
    } else if (this.state.animatedScale._value > 1 && this.state.animatedScale._value <= 2) {
      Animated.parallel([
        Animated.timing(this.state.animatedScale,{
          toValue: this.state.animatedScale._value,
          duration: 200
        }),
        Animated.timing(this.state.animatedoffsetX,{
          toValue: this.springHideBlackBlock(this.state.animatedScale._value).offsetX,
          duration: 200
        }),
        Animated.timing(this.state.animatedoffsetY,{
          toValue: this.springHideBlackBlock(this.state.animatedScale._value).offsetY,
          duration: 200
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = this.state.animatedScale._value
          //this.flatlist.setNativeProps({scrollEnabled: true})
        }
      })
    } else {
      Animated.parallel([
        Animated.timing(this.state.animatedScale,{
          toValue: 2,
          duration: 200
        }),
        Animated.timing(this.state.animatedoffsetX,{
          toValue: this.springHideBlackBlock(2).offsetX,
          duration: 200
        }),
        Animated.timing(this.state.animatedoffsetY,{
          toValue: this.springHideBlackBlock(2).offsetY,
          duration: 200
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = 2
        }
      })      
    }
  }

  springHideBlackBlock = scale => {
    const offsetBoundaryX = (scale*width/2-width/2)/scale
    const offsetBoundaryY = (scale*height/2-height/2)/scale
    let offsetX = this.state.animatedoffsetX._value
    let offsetY = this.state.animatedoffsetY._value
    if (Math.abs(this.state.animatedoffsetX._value) > offsetBoundaryX) {
      offsetX = offsetBoundaryX*Math.sign(this.state.animatedoffsetX._value)
    }
    if (Math.abs(this.state.animatedoffsetY._value) > offsetBoundaryY) {
      offsetY = offsetBoundaryY*Math.sign(this.state.animatedoffsetY._value)
    }
    return {offsetX,offsetY}
  }

  onScroll = ({nativeEvent}) => {
    this.scrollOffset = nativeEvent.contentOffset.y
    this.contentHeight = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height
  }

  render() {
    return (
      <View style={styles.comicbook}>
        <TapGestureHandler
          onHandlerStateChange={this.onSingleTap}
          waitFor={["double_tap","flatlist_pinch","flatlist_pan"]}
          maxDurationMs={200}
        >
          <TapGestureHandler
            id="double_tap"
            waitFor={["flatlist_pinch","flatlist_pan"]}
            onHandlerStateChange={this.onDoubleTap}
            numberOfTaps={2}
          >
            <PinchGestureHandler
              id="flatlist_pinch"
              simultaneousHandlers="flatlist_pan"
              onGestureEvent={this.onPinch} // 這有bug
            >
              <PanGestureHandler
                id="flatlist_pan"
                simultaneousHandlers="flatlist_pinch"
                onActivated={this.onPanStart}
                onGestureEvent={this.onPan}
                onEnded={this.onPanEnd}
                minPointers={1}
                maxPointers={2}
                avgTouches
                //enabled={false}
              >
                <AnimatedFlatList
                  ref={ref => this.flatlist = ref}
                  style={[styles.animatedFlatList,{
                    transform: [
                      {scale: this.state.animatedScale},
                      {translateX: this.state.animatedoffsetX},
                      {translateY: this.state.animatedoffsetY}
                    ]
                  }]}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={true}
                  onScroll={this.onScroll}
                  data={this.props.content}
                  overScrollMode={'never'}
                  renderItem={({ item }) =>
                    <ComicBookImage
                      resizeMode={'contain'} 
                      style={{width, height: width, backgroundColor: 'black'}}
                      source={{uri: item.uri}}
                      />
                    }
                />
              </PanGestureHandler>
            </PinchGestureHandler>
          </TapGestureHandler>
        </TapGestureHandler>
      </View>
    )
  }
}

const styles = {
  comicbook: {
    flex: 1,
    backgroundColor: 'black'
  },
  loadingStyle: { 
    size: 'large', 
    color: '#b3b3b3' 
  },
  dimensions: {
    width, 
    height: width
  }
}

/*
  render() {
    return (
      <View style={styles.comicbook}>
        <TapGestureHandler
          onHandlerStateChange={this.onSingleTap}
          waitFor={["double_tap","flatlist_pinch","flatlist_pan"]}
          maxDurationMs={200}
        >
          <TapGestureHandler
            id="double_tap"
            waitFor={["flatlist_pinch","flatlist_pan"]}
            onHandlerStateChange={this.onDoubleTap}
            numberOfTaps={2}
          >
            <PinchGestureHandler
              id="flatlist_pinch"
              simultaneousHandlers="flatlist_pan"
              onGestureEvent={this.onPinch}
            >
              <PanGestureHandler
                id="flatlist_pan"
                onActivated={this.onPanStart}
                onGestureEvent={this.onPan}
                onEnded={this.onPanEnd}
                minPointers={1}
                maxPointers={2}
                avgTouches
              >
                <AnimatedFlatList
                  ref={ref => this.flatlist = ref}
                  style={[styles.animatedFlatList,{
                    transform: [
                      {scale: this.state.animatedScale},
                      {translateX: this.state.animatedoffsetX},
                      {translateY: this.state.animatedoffsetY}
                    ]
                  }]}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={true}
                  onScroll={this.onScroll}
                  data={this.props.content}
                  overScrollMode={'never'}
                  renderItem={({ item }) =>
                    <ComicBookImage
                      resizeMode={'contain'} 
                      style={{width, height: width, backgroundColor: 'black'}}
                      source={{uri: item.uri}}
                      />
                    }
                />
              </PanGestureHandler>
            </PinchGestureHandler>
          </TapGestureHandler>
        </TapGestureHandler>
      </View>
    )
  }
*/