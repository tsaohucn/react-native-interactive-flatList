import React, { Component } from 'react'
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
  InteractionManager
} from 'react-native'

const { width, height } = Dimensions.get('window')

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

//const scaleThreshold = 0.007

export default class ComicBook extends Component {

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
    this.state = {
      isPinch: false
    }
    // 縮放
    this.lastDistance = null
    this.animatedScale = new Animated.Value(1)
    this.animatedheight = new Animated.Value(height)
    this.animatedoffsetX = new Animated.Value(0)
    this.animatedoffsetY = new Animated.Value(0)
    this.focusPointX = 0 // 關注點Ｘ
    this.focusPointY = 0 // 關注點Ｙ
    this.isPinch = false
    this.isSingleRelease = false
    this.isSpringBack = false
    this.amplificationFactor = 1
    // 平移
    //this.maxScrollY = height
    //this.isTop = true
    //this.isBottom = false
    //this.scrollY = 0
    //this.contentTranslate = 0
    //this.lastScrollY = 0
    //this.lastContentTranslate = 0

  }

  UNSAFE_componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      // Handler
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._onPanResponderRelease,
      onResponderTerminate : this._handlePanResponderTerminate,
      // Setter
      onStartShouldSetPanResponder: evt => true, // 開始觸碰，是否成為響應者
      onMoveShouldSetPanResponder: evt => true, // 開始移動，是否成為響應者
      onStartShouldSetPanResponderCapture: evt => true, // 開始觸碰，是否捕捉成為響應者
      onMoveShouldSetPanResponderCapture: evt => true,  // 開始移動，是否捕捉成為響應者
      onPanResponderTerminationRequest: evt => true, // 有其他響應者，是否釋放響應權
      onShouldBlockNativeResponder: evt => true // 返回一個布爾值，決定當前組件是否應該阻止原生組件成為JS響應者，默認返回true。目前暫時只支持android
    })
  }

  _handlePanResponderGrant = (e, gestureState) => { 
    // 此callback手指數會抓錯
    //console.warn(gestureState.numberActiveTouches)
  }

  _handlePanResponderMove = (e, gestureState) => {
    if (gestureState.numberActiveTouches === 2) {
      if (!this.state.isPinch) { 
        //新一次雙手觸摸
        this.focusPointX = ((e.nativeEvent.touches[0].pageX + e.nativeEvent.touches[1].pageX)/2 - width/2)/this.animatedScale._value - this.animatedoffsetX._value
        this.focusPointY = ((e.nativeEvent.touches[0].pageY + e.nativeEvent.touches[1].pageY)/2 - height/2)/this.animatedScale._value - this.animatedoffsetY._value
      }
      //this.isSingleRelease = false
      this.setState({
        isPinch: true
      })
      let dx = Math.abs(e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX)
      let dy = Math.abs(e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY)
      let distance = Math.sqrt(dx * dx + dy * dy)
      if (!this.lastDistance) {
        this.lastDistance = distance // 第一次lastDistance不存在給予把第一次的distance當作lastDistance
      }
      //if (this.animatedScale._value >=1) {
      //  this.amplificationFactor = 1
      //} else {
      //  this.amplificationFactor = 0.3
      //}
      let scale = (1+(distance - this.lastDistance)*this.amplificationFactor/this.lastDistance)*this.animatedScale._value
      this.lastDistance = distance
      if (scale > 3) {
        scale = 3
      } else if (scale < 0.5) {
        scale = 0.5
      }
      //if (this.animatedScale._value <= 0.6 && scale <= 0.6) {
      //  scale = this.animatedScale._value
      //}
      let magnifierCenterX = (e.nativeEvent.touches[0].pageX + e.nativeEvent.touches[1].pageX)/2 - width/2
      let magnifierCenterY = (e.nativeEvent.touches[0].pageY + e.nativeEvent.touches[1].pageY)/2 - height/2
      let offsetX = magnifierCenterX/scale-this.focusPointX
      let offsetY = magnifierCenterY/scale-this.focusPointY  
      if (scale >= 1) {
        let offsetBoundaryX = (scale*width/2-width/4)/scale
        let offsetBoundaryY = (scale*height/2-height*3/8)/scale
        offsetX = Math.abs(offsetX) > offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) : offsetX
        offsetY = Math.abs(offsetY) > offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) : offsetY
      }
      this._animation(offsetX,offsetY,scale,12)
    } else if (gestureState.numberActiveTouches === 1 && !this.isSpringBack) {
      //if (this.animatedScale._value > 1) {

      //} else if (this.animatedScale._value < 1) {
      //  this._onPanResponderSingleRelease()
      //}
      //alert('剩一隻手指')
      // translation
      /*
      if (Math.abs(gestureState.dy) > 0) {
        // scroll
        this.scrollY = this.lastScrollY - scrollScaleParam*gestureState.dy
        if (this.scrollY <= 0) {
          this.scrollY = 0
        } else if (this.scrollY >= this.maxScrollY) {
          this.scrollY = this.maxScrollY
        }
        this._flatList.scrollToOffset({animated: false, offset: this.scrollY})
      } 
      
      if (this.animatedScale._value > 1 && Math.abs(gestureState.dx) > 0) {
        //alert('平移了')
        this.contentTranslate = this.lastContentTranslate + gestureState.dx
        const maxTranslate = ((width*this.animatedScale._value) - width)/4
        if (Math.abs(this.contentTranslate) > maxTranslate) {
          this.contentTranslate = Math.sign(this.contentTranslate)*maxTranslate
        }
        this.animatedoffsetX.setValue(this.contentTranslate)
      }
      */
      
    }
    
  }

  _onPanResponderRelease =  (e, gestureState) => {
    this.setState({
      isPinch: false
    })
    this.lastDistance = null
    if (this.animatedScale._value > 2) {
      this._bigSpringBack(2)
    } else if (this.animatedScale._value >= 1 && this.animatedScale._value <=2) {
      this._middleSpringBack()
    } else if (this.animatedScale._value < 1) {
      this._smallSpringBack(1)
    }
    
  }

  _onPanResponderSingleRelease = () => {
    this.lastDistance = null
    this.isSingleRelease = true
    if (this.animatedScale._value > 2) {
      this._bigSpringBack(2)
    } else if (this.animatedScale._value >= 1 && this.animatedScale._value <=2) {
      this._middleSpringBack()
    } else if (this.animatedScale._value < 1) {
      this._smallSpringBack(1)
    }
  }

  _handlePanResponderTerminate =  (e, gestureState) => {
    alert('意外取消')
  }

  _bigSpringBack = scaleValue => {
    this.isSpringBack = true
    let offsetX = this._springHideBlackBlock(scaleValue).offsetX
    let offsetY = this._springHideBlackBlock(scaleValue).offsetY
    Animated.parallel([
      Animated.timing(this.animatedoffsetX,{
        toValue: offsetX,
        duration: 200
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: offsetY,
        duration: 200
      }),
      Animated.timing(this.animatedScale,{
        toValue: scaleValue,
        duration: 200
      })
    ]).start(() => {
      this.isSpringBack = false
    })
  }

  _middleSpringBack = () => {
    this.isSpringBack = true
    let offsetX = this._springHideBlackBlock(this.animatedScale._value).offsetX
    let offsetY = this._springHideBlackBlock(this.animatedScale._value).offsetY
    Animated.parallel([
      Animated.timing(this.animatedoffsetX,{
        toValue: offsetX,
        duration: 200
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: offsetY,
        duration: 200
      })
    ]).start(() => {
      this.isSpringBack = false
    })
  }

  _smallSpringBack = (scaleValue) => {
    this.isSpringBack = true
    Animated.parallel([
      Animated.timing(this.animatedScale,{
        toValue: scaleValue,
        duration: 200,
        //easing: Easing.out(Easing.ease)
      }),
      Animated.timing(this.animatedoffsetX,{
        toValue: 0,
        duration: 200,
        //easing: Easing.out(Easing.ease)
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: 0,
        duration: 200,
        //easing: Easing.out(Easing.ease)
      })
      //Animated.timing(this.animatedheight,{
      //  toValue: heightValue,
      //  duration: 200,
        //easing: Easing.out(Easing.ease)
      //}),
      //Animated.timing(this.animatedoffsetX,{
      //  toValue: 0,
      //  duration: 200,
        //easing: Easing.out(Easing.ease)
      //})
    ]).start(() => {
      this.isSpringBack = false
      //alert(this.animatedScale)
      //this._flatList.scrollToOffset({animated: false, offset: this.scrollY})
      // do something
    })
  }
  
  _animation = (offsetX,offsetY,scale) => {
    this.animatedoffsetX.setValue(offsetX)
    this.animatedoffsetY.setValue(offsetY)
    this.animatedScale.setValue(scale)   
  }
  /*
  _animation = (offsetX,offsetY,scale,duration) => {
    Animated.parallel([
      Animated.timing(this.animatedoffsetX,{
        toValue: offsetX,
        duration: duration
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: offsetY,
        duration: duration
      }),
      Animated.timing(this.animatedScale,{
        toValue: scale,
        duration: duration
      })
    ]).start(() => {
      //
    })    
  }
   */
  _springHideBlackBlock = scale => {
    let offsetBoundaryX = (scale*width/2-width/2)/scale
    let offsetBoundaryY = (scale*height/2-height/2)/scale
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

  render() {
    return (
      <AnimatedFlatList
        {...this.gestureHandlers.panHandlers}
        style={[styles.animatedFlatList,{
          height: this.animatedheight,
          transform: [
            {scaleX: this.animatedScale},
            {scaleY: this.animatedScale},
            {translateX: this.animatedoffsetX},
            {translateY: this.animatedoffsetY}
          ]
        }]}
        contentContainerStyle={styles.contentContainerStyle}
        ref={flatList => this._flatList = flatList}
        removeClippedSubviews
        onEndReachedThreshold={0.1}
        data={this.props.content}
        numColumns={1}
        scrollEnabled={false} // !this.state.isPinch && this.animatedScale._value <= 1
        showsHorizontalScrollIndicator={false}
        onScroll={({nativeEvent}) => {
          //this.onScroll(nativeEvent)
        }}
        renderItem={({ item }) =>
          <Image
            resizeMode={'contain'} 
            style={{width, height: item.height, backgroundColor: 'black'}}
            source={{uri: item.key}}
            />
          }
      />
    )
  }
}

const styles = StyleSheet.create({
  animatedFlatList: {
    //
  },
  contentContainerStyle: {
    //justifyContent: 'center',
    //alignItems: 'center'
  }

})

/*

  onScroll = ({layoutMeasurement, scrollY, contentSize}) => {
    //this.maxScrollY = contentSize.height - layoutMeasurement.height
  }

        <Animated.View 
          {...this.gestureHandlers.panHandlers}
            style={[styles.container,
              //this.props.style
              ,{
              height: this.animatedheight,
              transform: [
                {scaleX: this.animatedScale},
                {scaleY: this.animatedScale},
                {translateX: this.animatedoffsetX},
                {translateY: this.animatedoffsetY}
              ]
            }]}
            >
              <FlatList
                ref={flatList => this._flatList = flatList}
                removeClippedSubviews
                onEndReachedThreshold={0.1}
                data={this.props.content}
                numColumns={1}
                scrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                onScroll={({nativeEvent}) => {
                  this.onScroll(nativeEvent)
                }}
                renderItem={({ item }) =>
                  <Image
                    resizeMode={'contain'} 
                    style={{width, height: item.height, backgroundColor: 'black'}}
                    source={{uri: item.url}}
                  />
                }
              /> 
       </Animated.View>

*/
/*

  _handleStartShouldSetPanResponder = (e, gestureState) => {
    // don't respond to single touch to avoid shielding click on child components
    if (Platform.OS === 'ios') {
      return true
    } else {
      return false
    }
  }

  _handleMoveShouldSetPanResponder = (e, gestureState) => {
    if (Platform.OS === 'ios') {
      return true
    } else {
      //return this.props.scalable && gestureState.dx > 2 || gestureState.dy > 2 || gestureState.numberActiveTouches === 2
      return false // Android 縮訪抓在Modal裡抓不到
    }
  }
  _animated = (offsetX,offsetY,scale,duration) => {
    Animated.parallel([
      Animated.timing(this.animatedoffsetX,{
        toValue: offsetX,
        duration: duration
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: offsetY,
        duration: duration
      }),
      Animated.timing(this.animatedScale,{
        toValue: scale,
        duration: duration
      })
    ]).start(() => {
      //
    })    
  }
*/

        /*
        if (scale === 0.5) {
          let diffscale = Math.abs(1-scale/this.animatedScale._value)
          if (diffscale < scaleThreshold) {
            scale = this.animatedScale._value
            distance = this.lastDistance
          }
        }
        */