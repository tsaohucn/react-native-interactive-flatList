import React, { Component, PureComponent } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  FlatList,
  Image,
  Dimensions,
} from 'react-native'
import ComicBookImage from './ComicBookImage'
import {
  PanGestureHandler,
  TapGestureHandler,
  PinchGestureHandler,
  State
} from 'react-native-gesture-handler'
//import { USE_NATIVE_DRIVER } from './config';

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
    this.lastScale = 1
    this.focusPointX = 0
    this.scrollOffset = 0
    this.contentHeight = height
    this.isSingleReleasePan = true
    this.isDoubleReleasePan = true
    this.isSingleReleasePinch = true
    this.lastTranslationX = null
    this.lastTranslationY = null
    this.lastPointX = null
    this.lastPointY = null
    this.singleTapY = null
    this.doubleTapX = null
    this.doubleTapY = null
    this.focusPointX = null
    this.focusPointY = null
    this.isAnimated = false
    this.isSetSingleFocus = false
    this.isSetDoubleFocus = false
    this.animatedScale = new Animated.Value(1, { useNativeDriver: true })
    this.animatedoffsetX = new Animated.Value(0, { useNativeDriver: true })
    this.animatedoffsetY = new Animated.Value(0, { useNativeDriver: true })
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
      if (distance < 30) {
        if (this.animatedScale._value ===  1 ) {
          Animated.parallel([
            Animated.timing(this.animatedScale,{
              toValue: 2,
              duration: 200
            }),
            Animated.timing(this.animatedoffsetX,{
              toValue: -this.doubleTapX/2, // -A/2
              duration: 200
            }),
            Animated.timing(this.animatedoffsetY,{
              toValue: -this.doubleTapY/2, // -A/2
              duration: 200
            })
          ]).start(result => {
            if (result.finished) {
              this.lastScale = 2
            }          
          })
        } else if (this.animatedScale._value > 1 ) {
          Animated.parallel([
            Animated.timing(this.animatedScale,{
              toValue: 1,
              duration: 200
            }),
            Animated.timing(this.animatedoffsetX,{
              toValue: 0,
              duration: 200
            }),
            Animated.timing(this.animatedoffsetY,{
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

  onSingleTap = event => {
    if (event.nativeEvent.state === State.BEGAN) {
      this.singleTapY = event.nativeEvent.absoluteY
    }
    if (this.animatedScale._value ===  1 && event.nativeEvent.state === State.ACTIVE) {
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

  onPanStart = event => {
    this.flatlist.setNativeProps({scrollEnabled: false})
  }

  onPan = event => {
    if (event.nativeEvent.numberOfTouches === 2) {
      // 雙指平移
      if (this.isSingleReleasePan || this.isDoubleReleasePan) {
        this.isSingleReleasePan = false
        this.isDoubleReleasePan = false
        this.isSetSingleFocus = false
        
        if (this.isAnimated) {          
          this.animatedScale.stopAnimation(scaleValue => { 
            this.animatedoffsetX.stopAnimation(xValue => {
              this.animatedoffsetY.stopAnimation(yValue => {
                this.lastScale = scaleValue
                this.isAnimated = false
              })
            }) 
          })
        }
      }
      if (!this.isAnimated) {
        if (!this.isSetDoubleFocus) {
          this.isSetDoubleFocus = true
          this.focusPointX = (event.nativeEvent.absoluteX - width/2)/this.animatedScale._value - this.animatedoffsetX._value
          this.focusPointY = (event.nativeEvent.absoluteY - height/2)/this.animatedScale._value - this.animatedoffsetY._value
        }
        const magnifierCenterX = event.nativeEvent.absoluteX - width/2 // 目前雙手中心
        const magnifierCenterY = event.nativeEvent.absoluteY - height/2 // 目前雙手中心
        const offsetX = magnifierCenterX/this.animatedScale._value-this.focusPointX // 關注點到雙手中心需要的偏移量
        const offsetY = magnifierCenterY/this.animatedScale._value-this.focusPointY // 關注點到雙手中心需要的偏移量
        //this.animatedoffsetX.setValue(offsetX)
        //this.animatedoffsetY.setValue(offsetY)
        Animated.event(
          [{ offsetX: this.animatedoffsetX,
             offsetY: this.animatedoffsetY
          }]
        )({offsetX: offsetX,offsetY: offsetY})
      }
    } else {
      if (!(!this.isDoubleReleasePan && this.isSingleReleasePan)) {
        if (!this.isDoubleReleasePan && !this.isSingleReleasePan && !this.isAnimated) {
          this.backAnimated()
        }
        this.isDoubleReleasePan = false
        this.isSingleReleasePan = true
        this.isSetDoubleFocus = false
      }

      if (!this.isAnimated) {
        if (!this.isSetSingleFocus) {
          this.isSetSingleFocus = true
          this.lastTranslationX = this.animatedoffsetX._value
          this.lastTranslationY = this.animatedoffsetY._value
          this.lastPointX = event.nativeEvent.absoluteX
          this.lastPointY = event.nativeEvent.absoluteY
        }
        if (this.animatedScale._value > 1) {
          // 單指平移
          const diffX = (event.nativeEvent.absoluteX - this.lastPointX)/3
          const diffY = (event.nativeEvent.absoluteY - this.lastPointY)/3
          const offsetX = diffX + this.lastTranslationX
          const offsetY = diffY + this.lastTranslationY
          const offsetBoundaryX = (this.animatedScale._value*width/2-width/4)/this.animatedScale._value
          const offsetBoundaryY = (this.animatedScale._value*height/2-height/4)/this.animatedScale._value
          offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/(this.animatedScale._value*5)) : offsetX
          offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(this.animatedScale._value*1.5)) : offsetY
          //this.animatedoffsetX.setValue(offsetX)
          //this.animatedoffsetY.setValue(offsetY)
          Animated.event(
            [{ offsetX: this.animatedoffsetX,
               offsetY: this.animatedoffsetY
            }]
          )({offsetX: offsetX,offsetY: offsetY})
        }
      }
    }
  }

  onPanEnd = event => {
    this.isDoubleReleasePan = true
    this.isSingleReleasePan = true
    this.isSetSingleFocus = false
    this.isSetDoubleFocus = false
    if (!this.isAnimated) {
      this.backAnimated()
    }
  }

  onPinch = event => {
    if (!this.isAnimated) {
      if (event.nativeEvent.numberOfTouches === 2) {
        let scale = (event.nativeEvent.scale-1)+this.lastScale
        if (scale > 3) {
          scale = 3
        } else if (scale < 0.5) {
          scale = 0.5
        }
        //this.animatedScale.setValue(scale)
        Animated.event([{ scale: this.animatedScale}])({scale: scale})
      }
    }
  }


  backAnimated = () => {
    this.isAnimated = true
    if (this.animatedScale._value < 1) {
      Animated.parallel([
        Animated.timing(this.animatedScale,{
          toValue: 1,
          duration: 200,
        }),
        Animated.timing(this.animatedoffsetX,{
          toValue: 0,
          duration: 200,
        }),
        Animated.timing(this.animatedoffsetY,{
          toValue: 0,
          duration: 200,
        })
      ]).start(result => {
        if (result.finished) {
          this.flatlist.setNativeProps({scrollEnabled: true})
          this.lastScale = 1
          this.isAnimated = false
        }
      })
    } else if (this.animatedScale._value == 1) {
      Animated.parallel([
        Animated.timing(this.animatedoffsetX,{
          toValue: 0,
          duration: 200,
        }),
        Animated.timing(this.animatedoffsetY,{
          toValue: 0,
          duration: 200,
        })
      ]).start(result => {
        if (result.finished) {
          this.flatlist.setNativeProps({scrollEnabled: true})
          this.lastScale = 1
          this.isAnimated = false
        }       
      })
    } else if (this.animatedScale._value > 1 && this.animatedScale._value <= 2) {
      Animated.parallel([
        Animated.timing(this.animatedScale,{
          toValue: this.animatedScale._value,
          duration: 200,
        }),
        Animated.timing(this.animatedoffsetX,{
          toValue: this.springHideBlackBlock(this.animatedScale._value).offsetX,
          duration: 200,
        }),
        Animated.timing(this.animatedoffsetY,{
          toValue: this.springHideBlackBlock(this.animatedScale._value).offsetY,
          duration: 200,
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = this.animatedScale._value
          this.isAnimated = false
        }
      })
    } else {
      Animated.parallel([
        Animated.timing(this.animatedScale,{
          toValue: 2,
          duration: 200,
        }),
        Animated.timing(this.animatedoffsetX,{
          toValue: this.springHideBlackBlock(2).offsetX,
          duration: 200,
        }),
        Animated.timing(this.animatedoffsetY,{
          toValue: this.springHideBlackBlock(2).offsetY,
          duration: 200,
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = 2
          this.isAnimated = false
        }
      })      
    }    
  }

  springHideBlackBlock = scale => {
    const offsetBoundaryX = (scale*width/2-width/2)/scale
    const offsetBoundaryY = (scale*height/2-height/2)/scale
    let offsetX = this.animatedoffsetX._value
    let offsetY = this.animatedoffsetY._value
    if (Math.abs(this.animatedoffsetX._value) > offsetBoundaryX) {
      offsetX = offsetBoundaryX*Math.sign(this.animatedoffsetX._value)
    }
    if (Math.abs(this.animatedoffsetY._value) > offsetBoundaryY) {
      offsetY = offsetBoundaryY*Math.sign(this.animatedoffsetY._value)
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
            <PanGestureHandler
              id="flatlist_pan"
              simultaneousHandlers="flatlist_pinch"
              onActivated={this.onPanStart}
              onGestureEvent={this.onPan}
              onEnded={this.onPanEnd}
              minPointers={1}
              maxPointers={2}
              avgTouches
            >
              <PinchGestureHandler
                id="flatlist_pinch"
                simultaneousHandlers="flatlist_pan"
                onGestureEvent={this.onPinch}
                enabled={true}
              >
                <AnimatedFlatList
                  ref={ref => this.flatlist = ref}
                  style={[styles.animatedFlatList,{
                    transform: [
                      {scale: this.animatedScale},
                      {translateX: this.animatedoffsetX},
                      {translateY: this.animatedoffsetY}
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
              </PinchGestureHandler>
            </PanGestureHandler>
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
      //if (this.animatedScale._value >= 1) { 
        // 限制放大超過邊界時的偏移速度
        //const offsetBoundaryX = (this.animatedScale._value*width/2-width*3/8)/this.animatedScale._value
        //const offsetBoundaryY = (this.animatedScale._value*height/2-height/4)/this.animatedScale._value
        //offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/(this.animatedScale._value*5)) : offsetX
        //offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(this.animatedScale._value*1.5)) : offsetY
      //}
    */